"""
Servicios de negocio para Usuarios.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

from django.contrib.auth import get_user_model

from ..models import UsuarioPerfil

User = get_user_model()


def obtener_opciones_usuario(usuario_id: int) -> dict:
    """
    Retorna las opciones del sistema a las que tiene acceso el usuario.

    Si el usuario no existe o no está activo (``is_active = False``),
    devuelve un diccionario con todas las opciones en ``False``, equivalente
    a no tener acceso a ninguna opción.

    Parámetros
    ----------
    usuario_id : int
        PK del usuario en la tabla auth_user.

    Retorna
    -------
    dict con las claves:
      - expedientes  (bool)
      - licencias    (bool)
      - itse         (bool)
      - admin        (bool)

    Ejemplos
    --------
    >>> obtener_opciones_usuario(5)
    {'expedientes': True, 'licencias': True, 'itse': False, 'admin': False}

    >>> obtener_opciones_usuario(99)   # usuario inactivo o sin perfil
    {'expedientes': False, 'licencias': False, 'itse': False, 'admin': False}
    """
    _sin_acceso = {
        'expedientes': False,
        'licencias': False,
        'itse': False,
        'admin': False,
    }

    try:
        usuario = User.objects.get(pk=usuario_id)
    except User.DoesNotExist:
        return _sin_acceso

    if not usuario.is_active:
        return _sin_acceso

    try:
        perfil = UsuarioPerfil.objects.get(user_id=usuario_id)
    except UsuarioPerfil.DoesNotExist:
        return _sin_acceso

    return {
        'expedientes': perfil.expedientes,
        'licencias': perfil.licencias,
        'itse': perfil.itse,
        'admin': perfil.admin,
    }
