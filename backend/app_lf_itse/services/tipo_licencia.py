"""
Servicios de negocio para TipoLicencia.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from ..models import TipoLicencia


def listar_tipos_licencia(esta_activo: bool | None = None) -> list[TipoLicencia]:
    """
    Retorna los tipos de licencia ordenados por id.

    Parámetros
    ----------
    esta_activo : bool | None
        ``True``  → solo activos.
        ``False`` → solo inactivos.
        ``None``  → todos (sin filtro).

    Retorna
    -------
    list[TipoLicencia]
        Registros de la tabla ``tipos_licencia`` ordenados por id.
    """
    qs = TipoLicencia.objects.all()
    if esta_activo is not None:
        qs = qs.filter(esta_activo=esta_activo)
    return list(qs.order_by('id'))
