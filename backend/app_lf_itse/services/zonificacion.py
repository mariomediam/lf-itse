"""
Servicios de negocio para Zonificacion.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

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
