"""
Servicios de negocio para NivelRiesgo.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from ..models import NivelRiesgo


def listar_niveles_riesgo(esta_activo: bool | None = None) -> list[NivelRiesgo]:
    """
    Retorna los niveles de riesgo ordenados por id.

    Parámetros
    ----------
    esta_activo : bool | None
        ``True``  → solo activos.
        ``False`` → solo inactivos.
        ``None``  → todos (sin filtro).

    Retorna
    -------
    list[NivelRiesgo]
        Registros de la tabla ``niveles_riesgo`` ordenados por id.
    """
    qs = NivelRiesgo.objects.all()
    if esta_activo is not None:
        qs = qs.filter(esta_activo=esta_activo)
    return list(qs.order_by('id'))
