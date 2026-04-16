"""
Servicios de negocio para TipoProcedimientoTupa.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import TipoProcedimientoTupa


def listar_tipos_procedimiento_tupa() -> list[TipoProcedimientoTupa]:
    """
    Retorna todos los tipos de procedimiento TUPA ordenados por nombre.

    Retorna
    -------
    list[TipoProcedimientoTupa]
    """
    return list(
        TipoProcedimientoTupa.objects
        .select_related('unidad_organica')
        .order_by('nombre')
    )


def obtener_tipo_procedimiento_tupa(pk: int) -> TipoProcedimientoTupa:
    """
    Retorna el TipoProcedimientoTupa con la PK indicada.
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria del registro.

    Retorna
    -------
    TipoProcedimientoTupa
    """
    return get_object_or_404(
        TipoProcedimientoTupa.objects.select_related('unidad_organica'),
        pk=pk,
    )


def crear_tipo_procedimiento_tupa(data: dict, usuario) -> TipoProcedimientoTupa:
    """
    Crea y retorna un TipoProcedimientoTupa.

    ``usuario`` y ``fecha_digitacion`` se asignan automáticamente;
    no deben incluirse en ``data``.

    Parámetros
    ----------
    data : dict
        Datos validados por TipoProcedimientoTupaWriteSerializer.
        Claves esperadas:
          - codigo                  (str, obligatorio)
          - nombre                  (str, obligatorio)
          - plazo_atencion_dias     (int, obligatorio)
          - dias_alerta_vencimiento (int, obligatorio)
          - esta_activo             (bool, opcional)
          - unidad_organica_id      (int, obligatorio)
          - requiere_lf             (bool, opcional)
          - requiere_itse           (bool, opcional)
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del token JWT.

    Retorna
    -------
    TipoProcedimientoTupa
        Instancia recién creada.
    """
    return TipoProcedimientoTupa.objects.create(
        **data,
        usuario=usuario,
        fecha_digitacion=timezone.now(),
    )


def actualizar_tipo_procedimiento_tupa(pk: int, data: dict) -> TipoProcedimientoTupa:
    """
    Actualiza y retorna el TipoProcedimientoTupa indicado.
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria del registro a actualizar.
    data : dict
        Datos validados por TipoProcedimientoTupaWriteSerializer.

    Retorna
    -------
    TipoProcedimientoTupa
        Instancia actualizada.
    """
    tipo = get_object_or_404(TipoProcedimientoTupa, pk=pk)
    for campo, valor in data.items():
        setattr(tipo, campo, valor)
    tipo.save()
    return tipo


def eliminar_tipo_procedimiento_tupa(pk: int) -> None:
    """
    Elimina físicamente el TipoProcedimientoTupa indicado.
    Lanza HTTP 404 si no existe.

    Parámetros
    ----------
    pk : int
        Clave primaria del registro a eliminar.

    Lanza
    -----
    ProtectedError
        Si el registro está referenciado por expedientes u otros modelos
        con ``on_delete=PROTECT``.
    """
    tipo = get_object_or_404(TipoProcedimientoTupa, pk=pk)
    tipo.delete()
