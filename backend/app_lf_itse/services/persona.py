"""
Servicios de negocio para Personas.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from django.db import connection


# Bloque NOMBRE: filtra personas cuyo nombre completo coincida parcialmente.
_SQL_FILTRO_NOMBRE = """
    SELECT p.id AS persona_id
    FROM personas p
    WHERE TRIM(
        COALESCE(p.apellido_paterno, '') || ' ' ||
        COALESCE(p.apellido_materno, '') || ' ' ||
        COALESCE(p.nombres, '')
    ) ILIKE %s
"""

# Bloque DOCUMENTO: filtra por número de documento de identidad exacto.
_SQL_FILTRO_DOCUMENTO = """
    SELECT DISTINCT pd.persona_id
    FROM personas_documentos pd
    WHERE pd.numero_documento = %s
"""

# Bloque ID: filtra por clave primaria de la persona.
_SQL_FILTRO_ID = """
    SELECT %s::INTEGER AS persona_id
"""

# Consulta principal: recibe el bloque de filtro como subquery y
# concatena todos los documentos de identidad de cada persona en una sola celda.
_SQL_BUSCAR_PERSONAS = """
WITH personas_filtradas AS (
    {filtro}
),
documentos_concatenados AS (
    SELECT
        pf.persona_id,
        STRING_AGG(
            tdi.nombre || ' ' || pd.numero_documento,
            ', '
            ORDER BY tdi.nombre || ' ' || pd.numero_documento
        ) AS documento_concatenado
    FROM personas_filtradas pf
    LEFT JOIN personas_documentos pd
           ON pf.persona_id = pd.persona_id
    LEFT JOIN tipos_documento_identidad tdi
           ON pd.tipo_documento_identidad_id = tdi.id
    GROUP BY pf.persona_id
)
SELECT
    p.id,
    p.tipo_persona,
    p.apellido_paterno,
    p.apellido_materno,
    p.nombres,
    TRIM(
        COALESCE(p.apellido_paterno, '') || ' ' ||
        COALESCE(p.apellido_materno, '') || ' ' ||
        COALESCE(p.nombres, '')
    )                       AS persona_nombre,
    p.direccion,
    p.distrito,
    p.provincia,
    p.departamento,
    p.telefono,
    p.correo_electronico,
    p.fecha_creacion,
    p.fecha_actualizacion,
    p.user_id,
    dc.documento_concatenado
FROM documentos_concatenados dc
INNER JOIN personas p ON dc.persona_id = p.id
ORDER BY TRIM(
    COALESCE(p.apellido_paterno, '') || ' ' ||
    COALESCE(p.apellido_materno, '') || ' ' ||
    COALESCE(p.nombres, '')
)
"""

# Mapa de filtros: nombre → (subquery SQL, función de transformación del valor)
_FILTROS_BUSQUEDA: dict[str, tuple[str, callable]] = {
    'NOMBRE': (
        _SQL_FILTRO_NOMBRE,
        lambda v: '%' + v.replace(' ', '%') + '%',
    ),
    'DOCUMENTO': (
        _SQL_FILTRO_DOCUMENTO,
        str,
    ),
    'ID': (
        _SQL_FILTRO_ID,
        str,
    ),
}


def buscar_personas(filtro: str, valor: str) -> list[dict]:
    """
    Busca personas aplicando el filtro indicado sobre el valor recibido.
    Retorna una fila por persona con todos sus documentos de identidad
    concatenados en el campo ``documento_concatenado``.

    Parámetros
    ----------
    filtro : str
        Tipo de búsqueda.  Valores válidos:
          ─────────────────────────────────────────────────────────────────
          'NOMBRE'    → búsqueda parcial sobre apellidos y nombres
          'DOCUMENTO' → número de documento de identidad exacto
          'ID'        → clave primaria de la persona
          ─────────────────────────────────────────────────────────────────
    valor : str
        Valor a buscar según el filtro elegido.
          - NOMBRE:     texto parcial, ej. 'medina' o 'garcia lopez'
          - DOCUMENTO:  número exacto, ej. '20154477374'
          - ID:         entero como cadena, ej. '1'

    Retorna
    -------
    list[dict]
        Lista de personas que coinciden con el filtro.  Cada diccionario
        incluye:
          id, tipo_persona, apellido_paterno, apellido_materno, nombres,
          persona_nombre, direccion, distrito, provincia, departamento,
          telefono, correo_electronico, fecha_creacion, fecha_actualizacion,
          user_id, documento_concatenado.

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

    subquery, transformar = _FILTROS_BUSQUEDA[filtro]
    valor_param = transformar(valor)

    sql = _SQL_BUSCAR_PERSONAS.format(filtro=subquery)

    with connection.cursor() as cursor:
        cursor.execute(sql, [valor_param])
        columnas = [col.name for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
