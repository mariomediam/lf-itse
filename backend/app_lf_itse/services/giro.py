"""
Servicios de negocio para Giro.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from django.db.models import Q

from ..models import Giro


def buscar_giros(
    busqueda: str | None = None,
    esta_activo: bool | None = None,
) -> list[Giro]:
    """
    Retorna giros aplicando los filtros indicados, ordenados por ``nombre``.

    Parámetros
    ----------
    busqueda : str | None
        Texto libre que se busca simultáneamente en ``ciiu_id`` (si es numérico)
        y en ``nombre`` (búsqueda parcial, insensible a mayúsculas).
        Si es ``None`` o cadena vacía no se aplica ningún filtro de texto.
    esta_activo : bool | None
        ``True``  → solo activos.
        ``False`` → solo inactivos.
        ``None``  → todos (sin filtro).

    Retorna
    -------
    list[Giro]
        Registros de la tabla ``giros`` que cumplen los criterios, ordenados
        por ``nombre``.
    """
    qs = Giro.objects.all()

    if esta_activo is not None:
        qs = qs.filter(esta_activo=esta_activo)

    if busqueda:
        busqueda = busqueda.strip()
        filtro_nombre = Q(nombre__icontains=busqueda)
        if busqueda.isdigit():
            qs = qs.filter(filtro_nombre | Q(ciiu_id=int(busqueda)))
        else:
            qs = qs.filter(filtro_nombre)

    return list(qs.order_by('nombre'))
