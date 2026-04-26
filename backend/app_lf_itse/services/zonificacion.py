"""
Servicios de negocio para Zonificacion.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import Zonificacion


def listar_zonificaciones(esta_activo: bool | None = None) -> list[Zonificacion]:
    """
    Retorna las zonificaciones ordenadas por id.

    Parámetros
    ----------
    esta_activo : bool | None
        ``True``  → solo activas.
        ``False`` → solo inactivas.
        ``None``  → todas (sin filtro).

    Retorna
    -------
    list[Zonificacion]
        Registros de la tabla ``zonificaciones`` ordenados por id.
    """
    qs = Zonificacion.objects.all()
    if esta_activo is not None:
        qs = qs.filter(esta_activo=esta_activo)
    return list(qs.order_by('id'))


def obtener_zonificacion(pk: int) -> Zonificacion:
    """Retorna la Zonificacion con la PK indicada. Lanza HTTP 404 si no existe."""
    return get_object_or_404(Zonificacion, pk=pk)


def crear_zonificacion(data: dict, usuario) -> Zonificacion:
    """
    Crea una Zonificacion con los datos validados.

    Parámetros
    ----------
    data    : dict  — datos validados por ZonificacionWriteSerializer
    usuario : AUTH_USER_MODEL instance

    Retorna
    -------
    Zonificacion
        Instancia recién creada.
    """
    return Zonificacion.objects.create(
        **data,
        usuario=usuario,
        fecha_digitacion=timezone.now(),
    )


def actualizar_zonificacion(pk: int, data: dict) -> Zonificacion:
    """
    Actualiza los campos de una Zonificacion.

    Parámetros
    ----------
    pk   : int   — clave primaria de la zonificacion a actualizar
    data : dict  — datos validados por ZonificacionWriteSerializer

    Retorna
    -------
    Zonificacion
        Instancia actualizada.
    """
    zonificacion = get_object_or_404(Zonificacion, pk=pk)
    for campo, valor in data.items():
        setattr(zonificacion, campo, valor)
    zonificacion.save()
    return zonificacion


def eliminar_zonificacion(pk: int) -> None:
    """
    Elimina físicamente la Zonificacion indicada.
    Lanza HTTP 404 si no existe.
    Lanza ProtectedError si está referenciada por licencias de funcionamiento.
    """
    zonificacion = get_object_or_404(Zonificacion, pk=pk)
    zonificacion.delete()
