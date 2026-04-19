"""
Servicios de negocio para Estado.

Equivalente PostgreSQL de la consulta SQL Server::

    SELECT id, nombre, es_para_lf, es_para_itse, esta_activo
    FROM estados
    WHERE esta_activo = 0   -- en PostgreSQL: FALSE
      AND es_para_lf = 1   -- en PostgreSQL: TRUE
"""

from django.db import connection

_SQL_ESTADOS_INACTIVOS_LF = """
SELECT
    id,
    nombre,
    es_para_lf,
    es_para_itse,
    esta_activo
FROM estados
WHERE esta_activo = FALSE
  AND es_para_lf = TRUE
ORDER BY id
"""


def listar_estados_inactivos_para_lf() -> list[dict]:
    """
    Lista los estados inactivos aplicables a licencias de funcionamiento.

    Retorna los registros de ``estados`` donde ``esta_activo`` es falso y
    ``es_para_lf`` es verdadero (estados de inactividad que pueden usarse en LF).

    Retorna
    -------
    list[dict]
        Cada dict contiene: id, nombre, es_para_lf, es_para_itse, esta_activo.
    """
    with connection.cursor() as cursor:
        cursor.execute(_SQL_ESTADOS_INACTIVOS_LF)
        columnas = [col[0] for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
