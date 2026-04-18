"""
Servicios de negocio para NivelRiesgo.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from ..models import NivelRiesgo


def listar_niveles_riesgo() -> list[NivelRiesgo]:
    """
    Retorna todos los niveles de riesgo activos ordenados por id.

    Retorna
    -------
    list[NivelRiesgo]
        Registros activos de la tabla ``niveles_riesgo`` ordenados por id.
    """
    return list(NivelRiesgo.objects.filter(esta_activo=True).order_by('id'))
