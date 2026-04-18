"""
Servicios de negocio para Licencias de Funcionamiento.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

import logging

from django.db import connection

logger = logging.getLogger(__name__)


# ── Búsqueda de licencias de funcionamiento ────────────────────────────────────

# Consulta base: todos los campos de la licencia + datos del titular, conductor
# y expediente vinculado.  El filtro WHERE se inyecta como string seguro;
# el valor viaja como parámetro para evitar inyección SQL.
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
    ) AS conductor_nombre
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
{where}
ORDER BY lf.numero_licencia DESC
"""

# Mapa de filtros: nombre → (cláusula WHERE con %s, función de transformación del valor)
_FILTROS_BUSQUEDA: dict[str, tuple[str, callable]] = {
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
          titular_nombre, titular_ruc, conductor_nombre.

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
