"""
Servicios de negocio para ITSE.
"""

from django.db import connection

# Consulta base: campos de ITSE + expediente, titular, conductor, RUC y actividad.
# esta_activo: TRUE si no hay ningún estado inactivo en el historial (estados.esta_activo = FALSE).
_SQL_BUSCAR_ITSE = """
SELECT
    i.id,
    i.expediente_id,
    i.tipo_itse_id,
    i.numero_itse,
    i.fecha_expedicion,
    i.fecha_solicitud_renovacion,
    i.fecha_caducidad,
    i.titular_id,
    i.conductor_id,
    i.itse_principal_id,
    i.nombre_comercial,
    i.nivel_riesgo_id,
    i.direccion,
    i.resolucion_numero,
    i.area,
    i.numero_recibo_pago,
    i.observaciones,
    i.se_puede_publicar,
    i.capacidad_aforo,
    i.fecha_notificacion,
    i.usuario_id,
    i.fecha_digitacion,
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
        WHEN titse_inactivos.itse_id IS NULL THEN TRUE
        ELSE FALSE
    END AS esta_activo
FROM itse i
LEFT JOIN expedientes e
    ON i.expediente_id = e.id
LEFT JOIN personas AS ttitular
    ON i.titular_id = ttitular.id
LEFT JOIN personas AS tconductor
    ON i.conductor_id = tconductor.id
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
    ON i.titular_id = truc.persona_id
LEFT JOIN (
    SELECT DISTINCT ie.itse_id
    FROM itse_estados ie
    INNER JOIN estados est
        ON ie.estado_id = est.id
    WHERE est.esta_activo = FALSE
) AS titse_inactivos
    ON i.id = titse_inactivos.itse_id
{where}
ORDER BY i.numero_itse DESC
"""

_WHERE_FECHA_EXPEDICION = (
    'WHERE i.fecha_expedicion = %s',
    str,
)

_FILTROS_BUSQUEDA_ITSE: dict[str, tuple[str, callable]] = {
    'ID': (
        'WHERE i.id = %s',
        int,
    ),
    'NUMERO': (
        'WHERE i.numero_itse = %s',
        int,
    ),
    'EXPEDIENTE': (
        'WHERE e.numero_expediente = %s',
        int,
    ),
    'NOMBRE_COMERCIAL': (
        'WHERE i.nombre_comercial ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'FECHA_EXPEDICION': _WHERE_FECHA_EXPEDICION,
    # Alias usado en algunos scripts legacy (misma columna fecha_expedicion).
    'FECHA_EMISION': _WHERE_FECHA_EXPEDICION,
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
        'WHERE TRIM(i.direccion) ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'RECIBO_PAGO': (
        'WHERE TRIM(i.numero_recibo_pago) ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'RESOLUCION_NUMERO': (
        'WHERE TRIM(i.resolucion_numero) ILIKE %s',
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
}


def buscar_itse(filtro: str, valor: str) -> list[dict]:
    """
    Busca registros ITSE según filtro y valor (equivalente PostgreSQL del SQL Server original).

    Filtros válidos
    ---------------
    ID, NUMERO, EXPEDIENTE, NOMBRE_COMERCIAL, FECHA_EXPEDICION (o FECHA_EMISION),
    NOMBRES_TITULAR, RUC_TITULAR, NOMBRES_CONDUCTOR, DIRECCION, RECIBO_PAGO,
    RESOLUCION_NUMERO.
    """
    filtro = filtro.upper().strip()
    if filtro not in _FILTROS_BUSQUEDA_ITSE:
        raise ValueError(
            f"Filtro '{filtro}' no válido. "
            f"Opciones: {', '.join(sorted(set(_FILTROS_BUSQUEDA_ITSE)))}"
        )

    where_clause, transformar = _FILTROS_BUSQUEDA_ITSE[filtro]
    valor_param = transformar(valor)

    sql = _SQL_BUSCAR_ITSE.format(where=where_clause)

    with connection.cursor() as cursor:
        cursor.execute(sql, [valor_param])
        columnas = [col.name for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
