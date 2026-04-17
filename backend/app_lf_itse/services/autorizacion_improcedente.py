"""
Servicios de negocio para AutorizacionImprocedente.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import AutorizacionImprocedente, Expediente, Itse, LicenciaFuncionamiento


class LicenciaYaEmitidaError(Exception):
    """Se lanza cuando el expediente ya tiene una licencia de funcionamiento emitida."""


class ItseYaEmitidaError(Exception):
    """Se lanza cuando el expediente ya tiene una ITSE emitida."""


def denegar_licencia_funcionamiento(pk: int, data: dict, usuario) -> AutorizacionImprocedente:
    """
    Registra la denegación de emisión de una licencia de funcionamiento.

    Reglas de negocio
    -----------------
    1. Verifica que el expediente exista (404 si no).
    2. Verifica que el expediente NO tenga una licencia de funcionamiento
       ya emitida en la tabla ``licencias_funcionamiento``.
       Si existe, lanza ``LicenciaYaEmitidaError``.
    3. Crea el registro en ``autorizaciones_improcedentes`` con
       ``tipo_autorizacion = 'LF'``.

    Parámetros
    ----------
    pk : int
        PK del expediente al que se deniega la licencia.
    data : dict
        Datos validados por ``DenegarLicenciaSerializer``:
          - fecha_rechazo  (date)
          - documento      (str)
          - observaciones  (str)
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del JWT.

    Retorna
    -------
    AutorizacionImprocedente
        Instancia recién creada.

    Lanza
    -----
    Http404
        Si el expediente no existe.
    LicenciaYaEmitidaError
        Si el expediente ya tiene una licencia de funcionamiento emitida.
    """
    expediente = get_object_or_404(Expediente, pk=pk)

    if LicenciaFuncionamiento.objects.filter(expediente=expediente).exists():
        raise LicenciaYaEmitidaError(
            f'El expediente {pk} ya tiene una licencia de funcionamiento emitida. '
            'Para denegarla primero debe eliminar la licencia.'
        )

    return AutorizacionImprocedente.objects.create(
        expediente=expediente,
        tipo_autorizacion='LF',
        fecha_rechazo=data['fecha_rechazo'],
        documento=data['documento'],
        observaciones=data['observaciones'],
        usuario=usuario,
        fecha_digitacion=timezone.now(),
    )


def denegar_itse(pk: int, data: dict, usuario) -> AutorizacionImprocedente:
    """
    Registra la ITSE desfavorable para el expediente indicado.

    Reglas de negocio
    -----------------
    1. Verifica que el expediente exista (404 si no).
    2. Verifica que el expediente NO tenga una ITSE ya emitida en la tabla ``itse``.
       Si existe, lanza ``ItseYaEmitidaError``.
    3. Crea el registro en ``autorizaciones_improcedentes`` con
       ``tipo_autorizacion = 'ITSE'``.

    Parámetros
    ----------
    pk : int
        PK del expediente al que se declara la ITSE desfavorable.
    data : dict
        Datos validados por ``DenegarLicenciaSerializer``:
          - fecha_rechazo  (date)
          - documento      (str)
          - observaciones  (str)
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del JWT.

    Retorna
    -------
    AutorizacionImprocedente
        Instancia recién creada.

    Lanza
    -----
    Http404
        Si el expediente no existe.
    ItseYaEmitidaError
        Si el expediente ya tiene una ITSE emitida.
    """
    expediente = get_object_or_404(Expediente, pk=pk)

    if Itse.objects.filter(expediente=expediente).exists():
        raise ItseYaEmitidaError(
            f'El expediente {pk} ya tiene una ITSE emitida. '
            'Para declararla desfavorable primero debe eliminar la ITSE.'
        )

    return AutorizacionImprocedente.objects.create(
        expediente=expediente,
        tipo_autorizacion='ITSE',
        fecha_rechazo=data['fecha_rechazo'],
        documento=data['documento'],
        observaciones=data['observaciones'],
        usuario=usuario,
        fecha_digitacion=timezone.now(),
    )
