"""
Servicios de negocio para Licencias de Funcionamiento.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

import logging

from django.db import connection, transaction
from django.utils import timezone

from ..models import AutorizacionImprocedente, Itse, LicenciaFuncionamiento, LicenciaFuncionamientoGiro

logger = logging.getLogger(__name__)


class LicenciaDuplicadaError(Exception):
    """Se lanza cuando ya existe una licencia con el mismo número."""


class ReciboPagoDuplicadoError(Exception):
    """Se lanza cuando el número de recibo de pago ya está registrado en otra tabla."""


class LicenciaDenegadaError(Exception):
    """Se lanza cuando el expediente ya tiene una licencia de funcionamiento denegada."""


# ── Búsqueda de licencias de funcionamiento ────────────────────────────────────

# Consulta base: todos los campos de la licencia + datos del titular, conductor,
# expediente vinculado y estado de actividad calculado desde el historial de estados.
# El filtro WHERE se inyecta como string seguro; el valor viaja como parámetro.
#
# esta_activo: TRUE si la licencia NO tiene ningún estado inactivo registrado,
#              FALSE si tiene al menos un estado cuyo 'estados.esta_activo = FALSE'.
_SQL_BUSCAR_LF = """
SELECT
    lf.id,
    lf.expediente_id,
    lf.tipo_licencia_id,
    lf.numero_licencia,
    lf.fecha_emision,
    lf.titular_id,
    lf.conductor_id,
    lf.licencia_principal_id,
    lf.nombre_comercial,
    lf.es_vigencia_indeterminada,
    lf.fecha_inicio_vigencia,
    lf.fecha_fin_vigencia,
    lf.nivel_riesgo_id,
    lf.actividad,
    lf.direccion,
    lf.hora_desde,
    lf.hora_hasta,
    lf.resolucion_numero,
    lf.zonificacion_id,
    lf.area,
    lf.numero_recibo_pago,
    lf.observaciones,
    lf.se_puede_publicar,
    lf.fecha_notificacion,
    lf.usuario_id,
    lf.fecha_digitacion,
    e.numero_expediente,
    e.fecha_recepcion,
    TRIM(
        COALESCE(ttitular.apellido_paterno, '') || ' ' ||
        COALESCE(ttitular.apellido_materno, '') || ' ' ||
        COALESCE(ttitular.nombres, '')
    ) AS titular_nombre,
    truc.numero_documento AS titular_ruc,
    TRIM(
        COALESCE(tconductor.apellido_paterno, '') || ' ' ||
        COALESCE(tconductor.apellido_materno, '') || ' ' ||
        COALESCE(tconductor.nombres, '')
    ) AS conductor_nombre,
    CASE
        WHEN tlicencias_inactivas.licencia_funcionamiento_id IS NULL THEN TRUE
        ELSE FALSE
    END AS esta_activo
FROM licencias_funcionamiento lf
LEFT JOIN tipos_licencia tl
    ON lf.tipo_licencia_id = tl.id
LEFT JOIN expedientes e
    ON lf.expediente_id = e.id
LEFT JOIN personas AS ttitular
    ON lf.titular_id = ttitular.id
LEFT JOIN personas AS tconductor
    ON lf.conductor_id = tconductor.id
LEFT JOIN (
    SELECT
        pd.id,
        pd.persona_id,
        pd.numero_documento
    FROM personas_documentos pd
    INNER JOIN tipos_documento_identidad tdi
        ON pd.tipo_documento_identidad_id = tdi.id
    WHERE tdi.codigo = '06'
) AS truc
    ON lf.titular_id = truc.persona_id
LEFT JOIN (
    SELECT DISTINCT lfe.licencia_funcionamiento_id
    FROM licencias_funcionamiento_estados lfe
    INNER JOIN estados est
        ON lfe.estado_id = est.id
    WHERE est.esta_activo = FALSE
) AS tlicencias_inactivas
    ON lf.id = tlicencias_inactivas.licencia_funcionamiento_id
{where}
ORDER BY lf.numero_licencia DESC
"""

# Mapa de filtros: nombre → (cláusula WHERE con %s, función de transformación del valor)
_FILTROS_BUSQUEDA: dict[str, tuple[str, callable]] = {
    'ID': (
        'WHERE lf.id = %s',
        int,
    ),
    'NUMERO': (
        'WHERE lf.numero_licencia = %s',
        int,
    ),
    'EXPEDIENTE': (
        'WHERE e.numero_expediente = %s',
        int,
    ),
    'NOMBRE_COMERCIAL': (
        'WHERE lf.nombre_comercial ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'FECHA_EMISION': (
        'WHERE lf.fecha_emision = %s',
        str,
    ),
    'NOMBRES_TITULAR': (
        "WHERE TRIM("
        "    COALESCE(ttitular.apellido_paterno, '') || ' ' ||"
        "    COALESCE(ttitular.apellido_materno, '') || ' ' ||"
        "    COALESCE(ttitular.nombres, '')"
        ") ILIKE %s",
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'RUC_TITULAR': (
        'WHERE truc.numero_documento = %s',
        str,
    ),
    'NOMBRES_CONDUCTOR': (
        "WHERE TRIM("
        "    COALESCE(tconductor.apellido_paterno, '') || ' ' ||"
        "    COALESCE(tconductor.apellido_materno, '') || ' ' ||"
        "    COALESCE(tconductor.nombres, '')"
        ") ILIKE %s",
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'DIRECCION': (
        'WHERE TRIM(lf.direccion) ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'RECIBO_PAGO': (
        'WHERE TRIM(lf.numero_recibo_pago) ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'RESOLUCION_NUMERO': (
        'WHERE TRIM(lf.resolucion_numero) ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
}


def buscar_licencias(filtro: str, valor: str) -> list[dict]:
    """
    Busca licencias de funcionamiento aplicando el filtro indicado sobre el valor recibido.

    Equivalente PostgreSQL del procedimiento dinámico SQL Server original.

    Parámetros
    ----------
    filtro : str
        Tipo de búsqueda.  Valores válidos:
          ─────────────────────────────────────────────────────────────────
          'ID'                → ID de la licencia (exacto)
          'NUMERO'            → Número de licencia (exacto)
          'EXPEDIENTE'        → Número de expediente (exacto)
          'NOMBRE_COMERCIAL'  → Nombre comercial (parcial, insensible a mayúsculas)
          'FECHA_EMISION'     → Fecha de emisión en formato 'YYYY-MM-DD' (exacto)
          'NOMBRES_TITULAR'   → Apellidos y nombres del titular (parcial)
          'RUC_TITULAR'       → RUC del titular (exacto)
          'NOMBRES_CONDUCTOR' → Apellidos y nombres del conductor (parcial)
          'DIRECCION'         → Dirección del establecimiento (parcial)
          'RECIBO_PAGO'       → Número de recibo de pago (parcial)
          'RESOLUCION_NUMERO' → Número de resolución (parcial)
          ─────────────────────────────────────────────────────────────────
    valor : str
        Valor a buscar según el filtro elegido.

    Retorna
    -------
    list[dict]
        Lista de licencias que coinciden con el filtro.  Cada diccionario
        incluye todos los campos de la licencia más:
          numero_expediente, fecha_recepcion,
          titular_nombre, titular_ruc, conductor_nombre, esta_activo.

    Lanza
    -----
    ValueError
        Si el filtro no es uno de los valores válidos.
    """
    filtro = filtro.upper().strip()
    if filtro not in _FILTROS_BUSQUEDA:
        raise ValueError(
            f"Filtro '{filtro}' no válido. "
            f"Opciones: {', '.join(_FILTROS_BUSQUEDA)}"
        )

    where_clause, transformar = _FILTROS_BUSQUEDA[filtro]
    valor_param = transformar(valor)

    sql = _SQL_BUSCAR_LF.format(where=where_clause)

    with connection.cursor() as cursor:
        cursor.execute(sql, [valor_param])
        columnas = [col.name for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]


# ── Creación de licencia de funcionamiento ─────────────────────────────────────

def _validar_licencia_no_denegada(expediente_id: int) -> None:
    """
    Verifica que el expediente no tenga una licencia de funcionamiento denegada
    en ``autorizaciones_improcedentes``.

    Lanza
    -----
    LicenciaDenegadaError
        Si el expediente ya fue declarado improcedente para LF.
    """
    if AutorizacionImprocedente.objects.filter(
        expediente_id=expediente_id,
        tipo_autorizacion='LF',
    ).exists():
        raise LicenciaDenegadaError(
            'La licencia de funcionamiento ha sido denegada para este expediente, '
            'por lo tanto no se puede emitir.'
        )


def _validar_numero_licencia_unico(numero: int) -> None:
    """
    Verifica que no exista ya una licencia con el mismo ``numero_licencia``.

    Lanza
    -----
    LicenciaDuplicadaError
        Si el número ya está registrado.
    """
    if LicenciaFuncionamiento.objects.filter(numero_licencia=numero).exists():
        raise LicenciaDuplicadaError(
            f'Ya existe una licencia de funcionamiento con el número {numero}.'
        )


def _validar_recibo_pago_unico(numero_recibo: str) -> None:
    """
    Verifica que el ``numero_recibo_pago`` no esté registrado en
    ``licencias_funcionamiento`` ni en ``itse``.

    Lanza
    -----
    ReciboPagoDuplicadoError
        Si el número de recibo ya existe en alguna de las dos tablas,
        indicando en cuál se encontró.
    """
    if LicenciaFuncionamiento.objects.filter(numero_recibo_pago=numero_recibo).exists():
        raise ReciboPagoDuplicadoError(
            f'El número de recibo de pago "{numero_recibo}" ya se encuentra '
            'registrado en licencias de funcionamiento.'
        )
    if Itse.objects.filter(numero_recibo_pago=numero_recibo).exists():
        raise ReciboPagoDuplicadoError(
            f'El número de recibo de pago "{numero_recibo}" ya se encuentra '
            'registrado en ITSE.'
        )


def crear_licencia(data: dict, usuario) -> LicenciaFuncionamiento:
    """
    Crea y retorna una LicenciaFuncionamiento aplicando las reglas de negocio.

    Validaciones previas
    --------------------
    1. ``numero_licencia`` único en ``licencias_funcionamiento``.
    2. ``numero_recibo_pago`` único en ``licencias_funcionamiento`` e ``itse``.
    3. Si ``es_vigencia_indeterminada`` es ``True``, las fechas de vigencia
       se fuerzan a ``None``.
    4. Si ``es_vigencia_indeterminada`` es ``False``, ambas fechas de vigencia
       deben estar presentes (validado previamente en el serializer).

    Parámetros
    ----------
    data : dict
        Datos validados por ``LicenciaFuncionamientoCreateSerializer``.
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del token JWT (request.user).

    Retorna
    -------
    LicenciaFuncionamiento
        Instancia recién creada con sus giros asociados.

    Lanza
    -----
    LicenciaDenegadaError
        Si el expediente tiene una autorización improcedente de tipo 'LF'.
    LicenciaDuplicadaError
        Si ``numero_licencia`` ya existe.
    ReciboPagoDuplicadoError
        Si ``numero_recibo_pago`` ya existe en LF o ITSE.
    """
    _validar_licencia_no_denegada(data['expediente_id'])
    _validar_numero_licencia_unico(data['numero_licencia'])
    _validar_recibo_pago_unico(data['numero_recibo_pago'])

    # Si la vigencia es indeterminada, las fechas se anulan
    es_indeterminada = data['es_vigencia_indeterminada']
    fecha_inicio = None if es_indeterminada else data.get('fecha_inicio_vigencia')
    fecha_fin    = None if es_indeterminada else data.get('fecha_fin_vigencia')

    with transaction.atomic():
        licencia = LicenciaFuncionamiento.objects.create(
            expediente_id         = data['expediente_id'],
            tipo_licencia_id      = data['tipo_licencia_id'],
            numero_licencia       = data['numero_licencia'],
            fecha_emision         = data['fecha_emision'],
            titular_id            = data['titular_id'],
            conductor_id          = data['conductor_id'],
            licencia_principal_id = data.get('licencia_principal_id'),
            nombre_comercial      = data['nombre_comercial'],
            es_vigencia_indeterminada = es_indeterminada,
            fecha_inicio_vigencia = fecha_inicio,
            fecha_fin_vigencia    = fecha_fin,
            nivel_riesgo_id       = data['nivel_riesgo_id'],
            actividad             = data['actividad'],
            direccion             = data['direccion'],
            hora_desde            = data['hora_desde'],
            hora_hasta            = data['hora_hasta'],
            resolucion_numero     = data['resolucion_numero'],
            zonificacion_id       = data['zonificacion_id'],
            area                  = data['area'],
            numero_recibo_pago    = data['numero_recibo_pago'],
            observaciones         = data.get('observaciones'),
            se_puede_publicar     = data.get('se_puede_publicar', False),
            usuario               = usuario,
            fecha_digitacion      = timezone.now(),
        )

        giros = [
            LicenciaFuncionamientoGiro(
                licencia_funcionamiento=licencia,
                giro_id=item['giro_id'],
                usuario=usuario,
                fecha_digitacion=timezone.now(),
            )
            for item in data.get('giros', [])
        ]
        if giros:
            LicenciaFuncionamientoGiro.objects.bulk_create(giros)

    return licencia
