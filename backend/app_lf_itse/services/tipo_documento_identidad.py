"""
Servicios de negocio para TipoDocumentoIdentidad.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from ..models import TipoDocumentoIdentidad

_FILTROS_TIPO_PERSONA: dict[str, dict] = {
    'N': {'es_para_natural':  True},
    'J': {'es_para_juridica': True},
}


def listar_tipos_documento_identidad(tipo_persona: str) -> list[TipoDocumentoIdentidad]:
    """
    Retorna los tipos de documento de identidad activos según el tipo de persona.

    Parámetros
    ----------
    tipo_persona : str
        'N' → documentos para persona natural  (es_para_natural = true)
        'J' → documentos para persona jurídica (es_para_juridica = true)

    Retorna
    -------
    list[TipoDocumentoIdentidad]
        Registros activos ordenados por id.

    Lanza
    -----
    ValueError
        Si tipo_persona no es 'N' ni 'J'.
    """
    tipo_persona = tipo_persona.strip().upper()
    if tipo_persona not in _FILTROS_TIPO_PERSONA:
        raise ValueError(
            f"tipo_persona '{tipo_persona}' no válido. "
            "Opciones: N (natural), J (jurídica)."
        )

    return list(
        TipoDocumentoIdentidad.objects
        .filter(esta_activo=True, **_FILTROS_TIPO_PERSONA[tipo_persona])
        .order_by('id')
    )
