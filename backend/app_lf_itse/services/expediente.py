"""
Servicios de negocio para Expedientes.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from datetime import date, datetime

from django.db import connection
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import Expediente, TipoProcedimientoTupa
from ..utils import calcular_plazos_expediente, siguiente_numero_expediente


def obtener_tipo_procedimiento(tipo_id: int) -> TipoProcedimientoTupa:
    """
    Retorna el TipoProcedimientoTupa con la PK indicada.
    Lanza HTTP 404 si no existe.
    """
    return get_object_or_404(TipoProcedimientoTupa, pk=tipo_id)


def _normalizar_fecha(fecha) -> date:
    """Convierte datetime → date si es necesario."""
    if isinstance(fecha, datetime):
        return fecha.date()
    return fecha


def crear_expediente(data: dict, usuario) -> Expediente:
    """
    Crea y retorna un Expediente aplicando las reglas de negocio:

    1. Obtiene el TipoProcedimientoTupa (valida que exista y esté activo).
    2. Calcula el número de expediente si no fue enviado.
    3. Calcula fecha_vencimiento y fecha_alerta usando los plazos del tipo.
    4. Persiste el expediente con el usuario del JWT y la fecha del servidor.

    Parámetros
    ----------
    data : dict
        Datos validados por ExpedienteCreateSerializer.
        Claves esperadas:
          - tipo_procedimiento_tupa_id (int, obligatorio)
          - fecha_recepcion (date | datetime, obligatorio)
          - solicitante_id (int, obligatorio)
          - representante_id (int | None, opcional)
          - observaciones (str | None, opcional)
          - numero_expediente (int | None, opcional)
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del token JWT (request.user).

    Retorna
    -------
    Expediente
        Instancia recién creada con todos sus campos calculados.
    """
    tipo = obtener_tipo_procedimiento(data['tipo_procedimiento_tupa_id'])

    fecha_recepcion = data['fecha_recepcion']
    fecha_inicio = _normalizar_fecha(fecha_recepcion)

    numero = data.get('numero_expediente') or siguiente_numero_expediente(fecha_inicio)

    plazos = calcular_plazos_expediente(
        fecha_inicio=fecha_inicio,
        plazo_dias=tipo.plazo_atencion_dias,
        dias_alerta=tipo.dias_alerta_vencimiento,
    )

    expediente = Expediente.objects.create(
        tipo_procedimiento_tupa=tipo,
        numero_expediente=numero,
        fecha_recepcion=fecha_recepcion,
        solicitante_id=data['solicitante_id'],
        representante_id=data.get('representante_id'),
        observaciones=data.get('observaciones'),
        fecha_vencimiento=plazos['fecha_vencimiento'],
        fecha_alerta=plazos['fecha_alerta'],
        usuario=usuario,
        fecha_digitacion=timezone.now(),
    )

    return expediente


_SQL_EXPEDIENTES_PENDIENTES = """
SELECT
    e.id,
    e.numero_expediente,
    e.fecha_recepcion,
    tpt.nombre,
    e.fecha_vencimiento,
    e.fecha_alerta,
    TRIM(
        COALESCE(tsolicitante.apellido_paterno, '') || ' ' ||
        COALESCE(tsolicitante.apellido_materno, '') || ' ' ||
        COALESCE(tsolicitante.nombres, '')
    ) AS persona_nombre,
    texpedientes.licencia_pendiente,
    texpedientes.itse_pendiente
FROM (
    SELECT
        e.id,
        CASE
            WHEN tpt.requiere_lf = FALSE THEN FALSE
            WHEN tpt.requiere_lf = TRUE AND lf.id IS NOT NULL THEN FALSE
            WHEN tpt.requiere_lf = TRUE AND t_lf_improcedentes.id IS NOT NULL THEN FALSE
            ELSE TRUE
        END AS licencia_pendiente,
        CASE
            WHEN tpt.requiere_itse = FALSE THEN FALSE
            WHEN tpt.requiere_itse = TRUE AND i.id IS NOT NULL THEN FALSE
            WHEN tpt.requiere_itse = TRUE AND t_itse_improcedentes.id IS NOT NULL THEN FALSE
            ELSE TRUE
        END AS itse_pendiente
    FROM expedientes e
    LEFT JOIN tipos_procedimiento_tupa tpt
        ON e.tipo_procedimiento_tupa_id = tpt.id
    LEFT JOIN licencias_funcionamiento lf
        ON e.id = lf.expediente_id
    LEFT JOIN itse i
        ON e.id = i.expediente_id
    LEFT JOIN (
        SELECT id, tipo_autorizacion, expediente_id
        FROM autorizaciones_improcedentes
        WHERE tipo_autorizacion = 'LF'
    ) AS t_lf_improcedentes
        ON e.id = t_lf_improcedentes.expediente_id
    LEFT JOIN (
        SELECT id, tipo_autorizacion, expediente_id
        FROM autorizaciones_improcedentes
        WHERE tipo_autorizacion = 'ITSE'
    ) AS t_itse_improcedentes
        ON e.id = t_itse_improcedentes.expediente_id
) AS texpedientes
INNER JOIN expedientes e
    ON texpedientes.id = e.id
LEFT JOIN tipos_procedimiento_tupa tpt
    ON e.tipo_procedimiento_tupa_id = tpt.id
LEFT JOIN personas tsolicitante
    ON e.solicitante_id = tsolicitante.id
WHERE texpedientes.licencia_pendiente = TRUE
   OR texpedientes.itse_pendiente = TRUE
ORDER BY e.fecha_alerta DESC
"""


def listar_expedientes_pendientes() -> list[dict]:
    """
    Retorna los expedientes que tienen al menos una autorización pendiente
    (licencia de funcionamiento o ITSE), ordenados por fecha de alerta descendente.

    Cada elemento del listado contiene:
      - id
      - numero_expediente
      - fecha_recepcion
      - nombre            (tipo de procedimiento)
      - fecha_vencimiento
      - fecha_alerta
      - persona_nombre    (apellidos + nombres del solicitante)
      - licencia_pendiente
      - itse_pendiente

    Retorna
    -------
    list[dict]
        Lista de diccionarios; cada diccionario corresponde a una fila del resultado.
    """
    with connection.cursor() as cursor:
        cursor.execute(_SQL_EXPEDIENTES_PENDIENTES)
        columnas = [col.name for col in cursor.description]
        return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
