"""
Servicios de negocio para Expedientes.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from datetime import date, datetime

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
