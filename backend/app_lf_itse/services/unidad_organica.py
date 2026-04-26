"""
Servicios de negocio para UnidadOrganica.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from ..models import UnidadOrganica


def listar_unidades_organicas(esta_activo: bool | None = None) -> list[UnidadOrganica]:
    """
    Retorna las unidades orgánicas ordenadas por nombre.

    Parámetros
    ----------
    esta_activo : bool | None
        ``True``  → solo activas.
        ``False`` → solo inactivas.
        ``None``  → todas (sin filtro).

    Retorna
    -------
    list[UnidadOrganica]
        Registros de la tabla ``unidades_organicas`` ordenados por nombre.
    """
    qs = UnidadOrganica.objects.all()
    if esta_activo is not None:
        qs = qs.filter(esta_activo=esta_activo)
    return list(qs.order_by('nombre'))
