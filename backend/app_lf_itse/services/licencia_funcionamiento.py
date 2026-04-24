"""
Servicios de negocio para Licencias de Funcionamiento.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

import logging

from django.core.files.storage import default_storage
from django.db import connection, transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import (
    AutorizacionImprocedente,
    Expediente,
    LicenciaFuncionamiento,
    LicenciaFuncionamientoArchivo,
    LicenciaFuncionamientoEstado,
    LicenciaFuncionamientoGiro,
)

logger = logging.getLogger(__name__)


class LicenciaDuplicadaError(Exception):
    """Se lanza cuando ya existe una licencia con el mismo número."""


class ReciboPagoDuplicadoError(Exception):
    """Se lanza cuando el número de recibo ya está en otra licencia de funcionamiento."""


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
    END AS esta_activo,
    tl.nombre  AS tipo_licencia_nombre,
    z.nombre   AS zonificacion_nombre,
    nr.nombre  AS nivel_riesgo_nombre
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
LEFT JOIN zonificaciones z
    ON lf.zonificacion_id = z.id
LEFT JOIN niveles_riesgo nr
    ON lf.nivel_riesgo_id = nr.id
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


# ── Estados de licencia de funcionamiento ──────────────────────────────────────

_SQL_LISTAR_ESTADOS_LF = """
SELECT
    lfe.id,
    lfe.licencia_funcionamiento_id,
    lfe.estado_id,
    lfe.fecha_estado,
    lfe.documento,
    lfe.observaciones,
    lfe.usuario_id,
    lfe.fecha_digitacion,
    est.nombre  AS estado_nombre,
    est.es_para_lf,
    est.es_para_itse,
    est.esta_activo
FROM licencias_funcionamiento_estados lfe
LEFT JOIN estados est
    ON lfe.estado_id = est.id
WHERE lfe.licencia_funcionamiento_id = %s
ORDER BY lfe.fecha_digitacion DESC
"""


def listar_estados_licencia(licencia_funcionamiento_id: int) -> list[dict]:
    """
    Lista el historial de estados de una licencia de funcionamiento.

    Parámetros
    ----------
    licencia_funcionamiento_id : int
        PK de la licencia de funcionamiento.

    Retorna
    -------
    list[dict]
        Lista de estados ordenados por fecha de digitación descendente.
        Cada elemento incluye: id, licencia_funcionamiento_id, estado_id,
        fecha_estado, documento, observaciones, usuario_id, fecha_digitacion,
        estado_nombre, es_para_lf, es_para_itse, esta_activo.
    """
    with connection.cursor() as cursor:
        cursor.execute(_SQL_LISTAR_ESTADOS_LF, [licencia_funcionamiento_id])
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


def _validar_numero_licencia_unico_para_update(numero: int, licencia_id: int) -> None:
    """
    Igual que ``_validar_numero_licencia_unico`` pero excluye el registro
    que se está modificando (``licencia_id``).

    Lanza
    -----
    LicenciaDuplicadaError
        Si el número ya está registrado en otra licencia distinta.
    """
    if LicenciaFuncionamiento.objects.filter(
        numero_licencia=numero,
    ).exclude(pk=licencia_id).exists():
        raise LicenciaDuplicadaError(
            f'Ya existe una licencia de funcionamiento con el número {numero}.'
        )


def _validar_recibo_pago_unico(numero_recibo: str) -> None:
    """
    Verifica que el ``numero_recibo_pago`` no esté duplicado en
    ``licencias_funcionamiento``. El mismo valor puede usarse en ``itse``.

    Lanza
    -----
    ReciboPagoDuplicadoError
        Si el número de recibo ya existe en otra licencia.
    """
    if LicenciaFuncionamiento.objects.filter(numero_recibo_pago=numero_recibo).exists():
        raise ReciboPagoDuplicadoError(
            f'El número de recibo de pago "{numero_recibo}" ya se encuentra '
            'registrado en licencias de funcionamiento.'
        )


def _validar_recibo_pago_unico_para_update(numero_recibo: str, licencia_id: int) -> None:
    """
    Igual que ``_validar_recibo_pago_unico`` pero excluye el registro que se
    está modificando (``licencia_id``) al consultar ``licencias_funcionamiento``.

    Lanza
    -----
    ReciboPagoDuplicadoError
        Si el número de recibo ya existe en otra licencia.
    """
    if LicenciaFuncionamiento.objects.filter(
        numero_recibo_pago=numero_recibo,
    ).exclude(pk=licencia_id).exists():
        raise ReciboPagoDuplicadoError(
            f'El número de recibo de pago "{numero_recibo}" ya se encuentra '
            'registrado en licencias de funcionamiento.'
        )


def crear_licencia(data: dict, usuario) -> LicenciaFuncionamiento:
    """
    Crea y retorna una LicenciaFuncionamiento aplicando las reglas de negocio.

    Validaciones previas
    --------------------
    1. ``numero_licencia`` único en ``licencias_funcionamiento``.
    2. ``numero_recibo_pago`` único solo en ``licencias_funcionamiento`` (puede coincidir con ``itse``).
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
        Si ``numero_recibo_pago`` ya existe en otra licencia.
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


# ── Modificación de licencia de funcionamiento ─────────────────────────────────

def modificar_licencia(licencia_id: int, data: dict) -> LicenciaFuncionamiento:
    """
    Actualiza y retorna una LicenciaFuncionamiento existente.

    Validaciones previas
    --------------------
    1. La licencia debe existir; si no, lanza ``LicenciaFuncionamiento.DoesNotExist``.
    2. El expediente no debe tener una autorización improcedente de tipo 'LF'.
    3. ``numero_licencia`` único (excluyendo el registro actual).
    4. ``numero_recibo_pago`` único en ``licencias_funcionamiento`` (excluyendo
       el registro actual); puede coincidir con un recibo en ``itse``.
    5. Si ``es_vigencia_indeterminada`` es ``True``, las fechas de vigencia se
       fuerzan a ``None``.
    6. Si ``es_vigencia_indeterminada`` es ``False``, ambas fechas deben estar
       presentes (validado previamente en el serializer).

    Los giros se reemplazan completamente: se eliminan los existentes y se
    insertan los nuevos en una sola transacción atómica.

    Parámetros
    ----------
    licencia_id : int
        PK de la licencia a modificar.
    data : dict
        Datos validados por ``LicenciaFuncionamientoUpdateSerializer``.

    Retorna
    -------
    LicenciaFuncionamiento
        Instancia actualizada.

    Lanza
    -----
    LicenciaFuncionamiento.DoesNotExist
        Si no existe una licencia con ``licencia_id``.
    LicenciaDenegadaError
        Si el expediente tiene una autorización improcedente de tipo 'LF'.
    LicenciaDuplicadaError
        Si ``numero_licencia`` ya existe en otra licencia.
    ReciboPagoDuplicadoError
        Si ``numero_recibo_pago`` ya existe en otra licencia.
    """
    licencia = LicenciaFuncionamiento.objects.get(pk=licencia_id)

    _validar_licencia_no_denegada(data['expediente_id'])
    _validar_numero_licencia_unico_para_update(data['numero_licencia'], licencia_id)
    _validar_recibo_pago_unico_para_update(data['numero_recibo_pago'], licencia_id)

    es_indeterminada = data['es_vigencia_indeterminada']
    fecha_inicio = None if es_indeterminada else data.get('fecha_inicio_vigencia')
    fecha_fin    = None if es_indeterminada else data.get('fecha_fin_vigencia')

    with transaction.atomic():
        licencia.expediente_id          = data['expediente_id']
        licencia.tipo_licencia_id       = data['tipo_licencia_id']
        licencia.numero_licencia        = data['numero_licencia']
        licencia.fecha_emision          = data['fecha_emision']
        licencia.titular_id             = data['titular_id']
        licencia.conductor_id           = data['conductor_id']
        licencia.licencia_principal_id  = data.get('licencia_principal_id')
        licencia.nombre_comercial       = data['nombre_comercial']
        licencia.es_vigencia_indeterminada = es_indeterminada
        licencia.fecha_inicio_vigencia  = fecha_inicio
        licencia.fecha_fin_vigencia     = fecha_fin
        licencia.nivel_riesgo_id        = data['nivel_riesgo_id']
        licencia.actividad              = data['actividad']
        licencia.direccion              = data['direccion']
        licencia.hora_desde             = data['hora_desde']
        licencia.hora_hasta             = data['hora_hasta']
        licencia.resolucion_numero      = data['resolucion_numero']
        licencia.zonificacion_id        = data['zonificacion_id']
        licencia.area                   = data['area']
        licencia.numero_recibo_pago     = data['numero_recibo_pago']
        licencia.observaciones          = data.get('observaciones')
        licencia.se_puede_publicar      = data.get('se_puede_publicar', False)
        licencia.save()

        # Reemplaza completamente los giros asociados
        LicenciaFuncionamientoGiro.objects.filter(
            licencia_funcionamiento=licencia,
        ).delete()

        nuevos_giros = [
            LicenciaFuncionamientoGiro(
                licencia_funcionamiento=licencia,
                giro_id=item['giro_id'],
                usuario=licencia.usuario,
                fecha_digitacion=timezone.now(),
            )
            for item in data.get('giros', [])
        ]
        if nuevos_giros:
            LicenciaFuncionamientoGiro.objects.bulk_create(nuevos_giros)

    return licencia


# ── Verificación de expediente para emisión de licencia ────────────────────────

def verificar_numero_expediente_para_licencia(numero_expediente: int, anio: int) -> dict:
    """
    Verifica si un expediente (identificado por número y año de recepción)
    puede tener una licencia de funcionamiento emitida.

    Comprobaciones (en orden):
    1. Si no existe ningún expediente con el ``numero_expediente`` y el ``anio``
       indicados, no se puede emitir.
    2. Si el expediente tiene una autorización improcedente de tipo 'LF',
       la licencia fue denegada y no se puede emitir.
    3. Si el expediente ya tiene una licencia de funcionamiento emitida,
       tampoco se puede emitir una nueva.
    4. En caso contrario, se puede emitir.

    Parámetros
    ----------
    numero_expediente : int
        Número correlativo del expediente.
    anio : int
        Año de recepción del expediente (se extrae de ``fecha_recepcion``).

    Retorna
    -------
    dict con las claves:
        se_puede_emitir_licencia : bool
        expediente_id            : int | None  — ID del expediente (si existe)
        mensaje                  : str
    """
    expediente = Expediente.objects.filter(
        numero_expediente=numero_expediente,
        fecha_recepcion__year=anio,
    ).first()

    if not expediente:
        return {
            'se_puede_emitir_licencia': False,
            'expediente_id': None,
            'mensaje': 'El expediente no existe, primero debe ingresarlo.',
        }

    if AutorizacionImprocedente.objects.filter(
        expediente_id=expediente.id,
        tipo_autorizacion='LF',
    ).exists():
        return {
            'se_puede_emitir_licencia': False,
            'expediente_id': expediente.id,
            'mensaje': 'El expediente registra licencia denegada.',
        }

    licencia = LicenciaFuncionamiento.objects.filter(
        expediente_id=expediente.id,
    ).first()

    if licencia:
        return {
            'se_puede_emitir_licencia': False,
            'expediente_id': expediente.id,
            'mensaje': f'El expediente ya registra la licencia número {licencia.numero_licencia}.',
        }

    return {
        'se_puede_emitir_licencia': True,
        'expediente_id': expediente.id,
        'mensaje': '',
    }


# ── Registro de notificación de entrega ────────────────────────────────────────

class NotificacionFechaInvalidaError(Exception):
    """Se lanza cuando la fecha de notificación es anterior a la fecha de emisión."""


class EstadoInactivacionDuplicadoError(Exception):
    """Ya existe un registro con el mismo par licencia + estado."""


def registrar_notificacion(licencia_id: int, fecha_notificacion) -> LicenciaFuncionamiento:
    """
    Registra la fecha de notificación de entrega en una licencia de funcionamiento.

    Validaciones
    ------------
    1. La licencia debe existir; si no, lanza ``LicenciaFuncionamiento.DoesNotExist``.
    2. ``fecha_notificacion`` debe ser mayor o igual a ``fecha_emision``; de lo
       contrario lanza ``NotificacionFechaInvalidaError``.

    Parámetros
    ----------
    licencia_id : int
        PK de la licencia a actualizar.
    fecha_notificacion : date
        Fecha en que se entregó la notificación.

    Retorna
    -------
    LicenciaFuncionamiento
        Instancia actualizada con ``fecha_notificacion`` guardada.
    """
    licencia = LicenciaFuncionamiento.objects.get(pk=licencia_id)

    if fecha_notificacion < licencia.fecha_emision:
        raise NotificacionFechaInvalidaError(
            'La fecha de notificación no puede ser anterior a la fecha de emisión '
            f'({licencia.fecha_emision}).'
        )

    licencia.fecha_notificacion = fecha_notificacion
    licencia.save(update_fields=['fecha_notificacion'])
    return licencia


# ── Eliminación de licencia de funcionamiento ─────────────────────────────────


class LicenciaTieneDependientesError(Exception):
    """Se lanza cuando la licencia tiene licencias dependientes que impiden su eliminación."""


def eliminar_licencia(pk: int) -> None:
    """
    Elimina una licencia de funcionamiento y todos sus registros dependientes.

    Validaciones previas
    --------------------
    - Si la licencia tiene licencias dependientes (``licencia_principal_id`` apuntando
      a ella), lanza ``LicenciaTieneDependientesError``.

    Eliminación dentro de transacción
    ----------------------------------
    1. Recopila las rutas de los archivos digitales antes de tocar la BD.
    2. Elimina la licencia dentro de ``transaction.atomic()``.
       Django en cascada elimina:
         - ``licencias_funcionamiento_estados``  (on_delete=CASCADE)
         - ``licencias_funcionamiento_giros``    (on_delete=CASCADE)
         - ``licencias_funcionamiento_archivos`` (on_delete=CASCADE)
    3. Tras confirmar la transacción, elimina los archivos físicos del disco.
       Si algún borrado físico falla se registra un warning; la integridad de
       la BD ya está garantizada en ese punto.

    Parámetros
    ----------
    pk : int
        PK de la licencia de funcionamiento a eliminar.

    Lanza
    -----
    Http404
        Si la licencia no existe.
    LicenciaTieneDependientesError
        Si la licencia tiene licencias dependientes asociadas.
    """
    licencia = get_object_or_404(LicenciaFuncionamiento, pk=pk)

    if licencia.licencias_dependientes.exists():
        raise LicenciaTieneDependientesError(
            'No se puede eliminar la licencia: tiene licencias dependientes asociadas. '
            'Primero debe eliminar las licencias dependientes.'
        )

    rutas_archivos = list(
        LicenciaFuncionamientoArchivo.objects.filter(licencia_funcionamiento_id=pk)
        .values_list('ruta_archivo', flat=True)
    )

    with transaction.atomic():
        licencia.delete()

    for ruta in rutas_archivos:
        if default_storage.exists(ruta):
            try:
                default_storage.delete(ruta)
            except Exception:
                logger.warning(
                    'No se pudo eliminar el archivo físico "%s" de la licencia pk=%s.',
                    ruta, pk,
                )


# ── Registro de inactivación (historial en licencias_funcionamiento_estados) ────


def registrar_inactivacion_licencia(
    licencia_funcionamiento_id: int,
    estado_id: int,
    fecha_estado,
    documento: str,
    observaciones: str,
    usuario,
) -> LicenciaFuncionamientoEstado:
    """
    Inserta un registro en ``licencias_funcionamiento_estados``.

    Validaciones
    ------------
    1. La licencia debe existir; si no, lanza ``LicenciaFuncionamiento.DoesNotExist``.
    2. No puede existir ya un registro con el mismo ``licencia_funcionamiento_id``
       y ``estado_id``; de lo contrario lanza ``EstadoInactivacionDuplicadoError``.

    Parámetros
    ----------
    licencia_funcionamiento_id, estado_id, fecha_estado, documento, observaciones
        Datos del historial de estado.
    usuario
        Usuario autenticado (``request.user``); se guarda en ``usuario_id``.
    """
    LicenciaFuncionamiento.objects.get(pk=licencia_funcionamiento_id)

    if LicenciaFuncionamientoEstado.objects.filter(
        licencia_funcionamiento_id=licencia_funcionamiento_id,
        estado_id=estado_id,
    ).exists():
        raise EstadoInactivacionDuplicadoError(
            'Ya existe un registro para esta licencia con el mismo estado.'
        )

    return LicenciaFuncionamientoEstado.objects.create(
        licencia_funcionamiento_id=licencia_funcionamiento_id,
        estado_id=estado_id,
        fecha_estado=fecha_estado,
        documento=documento,
        observaciones=observaciones,
        usuario=usuario,
        fecha_digitacion=timezone.now(),
    )


# ── Reporte de licencias de funcionamiento ─────────────────────────────────────

_SQL_REPORTE_LF_FILTRADAS = """
SELECT DISTINCT lf.id
FROM licencias_funcionamiento lf
LEFT JOIN personas AS t_titular
    ON lf.titular_id = t_titular.id
LEFT JOIN expedientes e
    ON lf.expediente_id = e.id
LEFT JOIN personas_documentos AS titular_docs
    ON lf.titular_id = titular_docs.persona_id
LEFT JOIN personas AS t_conductor
    ON lf.conductor_id = t_conductor.id
LEFT JOIN personas_documentos AS conductor_docs
    ON lf.conductor_id = conductor_docs.persona_id
LEFT JOIN (
    SELECT DISTINCT lfe.licencia_funcionamiento_id
    FROM licencias_funcionamiento_estados lfe
    INNER JOIN estados est
        ON lfe.estado_id = est.id
    WHERE est.esta_activo = FALSE
) AS t_licencias_inactivas
    ON lf.id = t_licencias_inactivas.licencia_funcionamiento_id
LEFT JOIN licencias_funcionamiento_giros lfg
    ON lf.id = lfg.licencia_funcionamiento_id
LEFT JOIN giros g
    ON lfg.giro_id = g.id
{where}
"""

_SQL_REPORTE_LF_PRINCIPAL = """
WITH titular_docs_concat AS (
    SELECT
        lf_inner.id AS licencia_id,
        STRING_AGG(
            tdi.nombre || ' ' || pd.numero_documento,
            ', '
            ORDER BY tdi.nombre || ' ' || pd.numero_documento
        ) AS titular_documentos_concatenados
    FROM licencias_funcionamiento lf_inner
    LEFT JOIN personas_documentos pd ON lf_inner.titular_id = pd.persona_id
    LEFT JOIN tipos_documento_identidad tdi
        ON pd.tipo_documento_identidad_id = tdi.id
    WHERE lf_inner.id = ANY(%s)
    GROUP BY lf_inner.id
),
conductor_docs_concat AS (
    SELECT
        lf_inner.id AS licencia_id,
        STRING_AGG(
            tdi.nombre || ' ' || pd.numero_documento,
            ', '
            ORDER BY tdi.nombre || ' ' || pd.numero_documento
        ) AS conductor_documentos_concatenados
    FROM licencias_funcionamiento lf_inner
    LEFT JOIN personas_documentos pd ON lf_inner.conductor_id = pd.persona_id
    LEFT JOIN tipos_documento_identidad tdi
        ON pd.tipo_documento_identidad_id = tdi.id
    WHERE lf_inner.id = ANY(%s)
    GROUP BY lf_inner.id
),
giros_concat AS (
    SELECT
        lfg.licencia_funcionamiento_id AS licencia_id,
        STRING_AGG(
            LPAD(COALESCE(CAST(g.ciiu_id AS VARCHAR), ''), 4, '0') || ' ' || TRIM(g.nombre),
            ', '
            ORDER BY LPAD(COALESCE(CAST(g.ciiu_id AS VARCHAR), ''), 4, '0') || ' ' || TRIM(g.nombre)
        ) AS giro_concatenado
    FROM licencias_funcionamiento_giros lfg
    LEFT JOIN giros g ON lfg.giro_id = g.id
    WHERE lfg.licencia_funcionamiento_id = ANY(%s)
    GROUP BY lfg.licencia_funcionamiento_id
)
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
    tdc.titular_documentos_concatenados,
    cdc.conductor_documentos_concatenados,
    gc.giro_concatenado,
    e.numero_expediente,
    e.fecha_recepcion,
    tpt.nombre AS tipos_procedimiento_tupa_nombre,
    TRIM(
        COALESCE(t_titular.apellido_paterno, '') || ' ' ||
        COALESCE(t_titular.apellido_materno, '') || ' ' ||
        COALESCE(t_titular.nombres, '')
    ) AS titular_nombre,
    t_titular.direccion    AS titular_direccion,
    t_titular.distrito     AS titular_distrito,
    t_titular.provincia    AS titular_provincia,
    t_titular.departamento AS titular_departamento,
    t_titular.telefono     AS titular_telefono,
    t_titular.correo_electronico AS titular_correo_electronico,
    TRIM(
        COALESCE(t_conductor.apellido_paterno, '') || ' ' ||
        COALESCE(t_conductor.apellido_materno, '') || ' ' ||
        COALESCE(t_conductor.nombres, '')
    ) AS conductor_nombre,
    t_conductor.direccion    AS conductor_direccion,
    t_conductor.distrito     AS conductor_distrito,
    t_conductor.provincia    AS conductor_provincia,
    t_conductor.departamento AS conductor_departamento,
    t_conductor.telefono     AS conductor_telefono,
    t_conductor.correo_electronico AS conductor_correo_electronico
FROM licencias_funcionamiento lf
LEFT JOIN titular_docs_concat tdc ON lf.id = tdc.licencia_id
LEFT JOIN conductor_docs_concat cdc ON lf.id = cdc.licencia_id
LEFT JOIN giros_concat gc ON lf.id = gc.licencia_id
LEFT JOIN expedientes e ON lf.expediente_id = e.id
LEFT JOIN tipos_procedimiento_tupa tpt ON e.tipo_procedimiento_tupa_id = tpt.id
LEFT JOIN personas AS t_titular ON lf.titular_id = t_titular.id
LEFT JOIN personas AS t_conductor ON lf.conductor_id = t_conductor.id
WHERE lf.id = ANY(%s)
ORDER BY lf.fecha_emision
"""


def reporte_licencias(filtros: dict) -> list[dict]:
    """
    Genera el reporte de licencias de funcionamiento aplicando los filtros opcionales
    provistos.

    El proceso se realiza en dos pasos:
      1. Se obtienen los ``id`` de las licencias que cumplen todos los filtros
         mediante una consulta dinámica.
      2. Con esos ``id`` se construye el resultado final enriquecido con
         documentos del titular/conductor y giros concatenados.

    Parámetros
    ----------
    filtros : dict
        Diccionario con los filtros opcionales.  Claves aceptadas (todas opcionales):

        numero_licencia         – int
        numero_expediente       – int
        anio_expediente         – int
        emision_desde           – date
        emision_hasta           – date  (requiere emision_desde)
        titular_nombre          – str   (búsqueda parcial)
        titular_numero_documento – str
        conductor_nombre        – str   (búsqueda parcial)
        conductor_numero_documento – str
        nombre_comercial        – str   (búsqueda parcial)
        vigencia_desde          – date
        vigencia_hasta          – date  (requiere vigencia_desde)
        nivel_riesgo_id         – int
        direccion               – str   (búsqueda parcial)
        zonificacion_id         – int
        numero_recibo_pago      – str
        fecha_notificacion_desde – date
        fecha_notificacion_hasta – date  (requiere fecha_notificacion_desde)
        esta_activo             – bool
        giro_nombre             – str   (búsqueda parcial)

    Retorna
    -------
    list[dict]
        Lista de licencias que cumplen los filtros, con todos los campos de la
        licencia más datos del titular, conductor, expediente y giros concatenados.
    """
    condiciones: list[str] = []
    params: list = []

    numero_licencia = filtros.get('numero_licencia')
    if numero_licencia is not None:
        condiciones.append('lf.numero_licencia = %s')
        params.append(numero_licencia)

    numero_expediente = filtros.get('numero_expediente')
    if numero_expediente is not None:
        condiciones.append('e.numero_expediente = %s')
        params.append(numero_expediente)

    anio_expediente = filtros.get('anio_expediente')
    if anio_expediente is not None:
        condiciones.append('EXTRACT(YEAR FROM e.fecha_recepcion) = %s')
        params.append(anio_expediente)

    emision_desde = filtros.get('emision_desde')
    emision_hasta = filtros.get('emision_hasta')
    if emision_desde is not None and emision_hasta is not None:
        condiciones.append('lf.fecha_emision BETWEEN %s AND %s')
        params.extend([emision_desde, emision_hasta])

    titular_nombre = filtros.get('titular_nombre')
    if titular_nombre is not None:
        patron = '%' + titular_nombre.replace(' ', '%') + '%'
        condiciones.append(
            "TRIM("
            "    COALESCE(t_titular.apellido_paterno, '') || ' ' ||"
            "    COALESCE(t_titular.apellido_materno, '') || ' ' ||"
            "    COALESCE(t_titular.nombres, '')"
            ") ILIKE %s"
        )
        params.append(patron)

    titular_numero_documento = filtros.get('titular_numero_documento')
    if titular_numero_documento is not None:
        condiciones.append('titular_docs.numero_documento = %s')
        params.append(titular_numero_documento)

    conductor_nombre = filtros.get('conductor_nombre')
    if conductor_nombre is not None:
        patron = '%' + conductor_nombre.replace(' ', '%') + '%'
        condiciones.append(
            "TRIM("
            "    COALESCE(t_conductor.apellido_paterno, '') || ' ' ||"
            "    COALESCE(t_conductor.apellido_materno, '') || ' ' ||"
            "    COALESCE(t_conductor.nombres, '')"
            ") ILIKE %s"
        )
        params.append(patron)

    conductor_numero_documento = filtros.get('conductor_numero_documento')
    if conductor_numero_documento is not None:
        condiciones.append('conductor_docs.numero_documento = %s')
        params.append(conductor_numero_documento)

    nombre_comercial = filtros.get('nombre_comercial')
    if nombre_comercial is not None:
        patron = '%' + nombre_comercial.replace(' ', '%') + '%'
        condiciones.append('TRIM(lf.nombre_comercial) ILIKE %s')
        params.append(patron)

    vigencia_desde = filtros.get('vigencia_desde')
    vigencia_hasta = filtros.get('vigencia_hasta')
    if vigencia_desde is not None and vigencia_hasta is not None:
        condiciones.append(
            '('
            '    (lf.es_vigencia_indeterminada = TRUE AND lf.fecha_emision <= %s)'
            '    OR (lf.fecha_emision BETWEEN %s AND %s)'
            ')'
        )
        params.extend([vigencia_desde, vigencia_desde, vigencia_hasta])

    nivel_riesgo_id = filtros.get('nivel_riesgo_id')
    if nivel_riesgo_id is not None:
        condiciones.append('lf.nivel_riesgo_id = %s')
        params.append(nivel_riesgo_id)

    direccion = filtros.get('direccion')
    if direccion is not None:
        patron = '%' + direccion.replace(' ', '%') + '%'
        condiciones.append('TRIM(lf.direccion) ILIKE %s')
        params.append(patron)

    zonificacion_id = filtros.get('zonificacion_id')
    if zonificacion_id is not None:
        condiciones.append('lf.zonificacion_id = %s')
        params.append(zonificacion_id)

    numero_recibo_pago = filtros.get('numero_recibo_pago')
    if numero_recibo_pago is not None:
        condiciones.append('lf.numero_recibo_pago = %s')
        params.append(numero_recibo_pago)

    fecha_notificacion_desde = filtros.get('fecha_notificacion_desde')
    fecha_notificacion_hasta = filtros.get('fecha_notificacion_hasta')
    if fecha_notificacion_desde is not None and fecha_notificacion_hasta is not None:
        condiciones.append('lf.fecha_notificacion BETWEEN %s AND %s')
        params.extend([fecha_notificacion_desde, fecha_notificacion_hasta])

    esta_activo = filtros.get('esta_activo')
    if esta_activo is not None:
        if esta_activo:
            condiciones.append('t_licencias_inactivas.licencia_funcionamiento_id IS NULL')
        else:
            condiciones.append('t_licencias_inactivas.licencia_funcionamiento_id IS NOT NULL')

    giro_nombre = filtros.get('giro_nombre')
    if giro_nombre is not None:
        patron = '%' + giro_nombre.replace(' ', '%') + '%'
        condiciones.append('TRIM(g.nombre) ILIKE %s')
        params.append(patron)

    where_clause = ('WHERE ' + ' AND '.join(condiciones)) if condiciones else ''
    sql_filtradas = _SQL_REPORTE_LF_FILTRADAS.format(where=where_clause)

    with connection.cursor() as cursor:
        cursor.execute(sql_filtradas, params)
        ids_filtrados = [fila[0] for fila in cursor.fetchall()]

    if not ids_filtrados:
        return []

    with connection.cursor() as cursor:
        # El mismo array de IDs se pasa 4 veces: una por cada CTE (titular, conductor,
        # giros) y una vez en el WHERE final de la consulta principal.
        cursor.execute(_SQL_REPORTE_LF_PRINCIPAL, [
            ids_filtrados,
            ids_filtrados,
            ids_filtrados,
            ids_filtrados,
        ])
        columnas = [col.name for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
