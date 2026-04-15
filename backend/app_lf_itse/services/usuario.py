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


def construir_menu_usuario(usuario_id: int) -> list[dict]:
    """
    Construye la estructura de menús a los que tiene acceso el usuario.

    Reglas de visibilidad
    ---------------------
    - Dashboard y Reportes (con sus submenús): siempre visibles.
    - Expedientes:  requiere ``opciones['expedientes'] = True``.
    - Licencias de funcionamiento: requiere ``opciones['licencias'] = True``.
    - Certificados ITSE: requiere ``opciones['itse'] = True``.
    - Catálogos (con sus submenús): visible si el usuario tiene al menos uno de
      ``expedientes``, ``licencias``, ``itse`` o ``admin``.
    - Usuarios: requiere ``opciones['admin'] = True``.

    Parámetros
    ----------
    usuario_id : int
        PK del usuario en la tabla auth_user.

    Retorna
    -------
    list[dict]
        Lista de menús ordenados según el diseño del sistema.
        Cada elemento contiene:
          - id        (str)  identificador único del menú
          - label     (str)  texto a mostrar en la interfaz
          - url       (str)  ruta del frontend
          - submenues (list) lista de submenús con la misma estructura
    """
    opciones = obtener_opciones_usuario(usuario_id)

    tiene_catalogo = (
        opciones['expedientes']
        or opciones['licencias']
        or opciones['itse']
        or opciones['admin']
    )

    menus: list[dict] = []

    # --- Dashboard (siempre visible) ---
    menus.append({
        'id': 'dashboard',
        'label': 'Dashboard',
        'url': '/dashboard',
        'submenues': [],
    })

    # --- Expedientes ---
    if opciones['expedientes']:
        menus.append({
            'id': 'expedientes',
            'label': 'Expedientes',
            'url': '/expedientes',
            'submenues': [],
        })

    # --- Licencias de funcionamiento ---
    if opciones['licencias']:
        menus.append({
            'id': 'licencias-funcionamiento',
            'label': 'Licencias de funcionamiento',
            'url': '/licencias-funcionamiento',
            'submenues': [],
        })

    # --- Certificados ITSE ---
    if opciones['itse']:
        menus.append({
            'id': 'certificados-itse',
            'label': 'Certificados ITSE',
            'url': '/certificados-itse',
            'submenues': [],
        })

    # --- Reportes (siempre visible) ---
    menus.append({
        'id': 'reportes',
        'label': 'Reportes',
        'url': '/reportes',
        'submenues': [
            {
                'id': 'reportes-expedientes',
                'label': 'Expedientes',
                'url': '/reportes/expedientes',
                'submenues': [],
            },
            {
                'id': 'reportes-licencias-funcionamiento',
                'label': 'Licencias de funcionamiento',
                'url': '/reportes/licencias-funcionamiento',
                'submenues': [],
            },
            {
                'id': 'reportes-certificados-itse',
                'label': 'Certificados ITSE',
                'url': '/reportes/certificados-itse',
                'submenues': [],
            },
        ],
    })

    # --- Catálogos ---
    if tiene_catalogo:
        menus.append({
            'id': 'catalogos',
            'label': 'Catálogos',
            'url': '/catalogos',
            'submenues': [
                {
                    'id': 'catalogos-personas',
                    'label': 'Personas',
                    'url': '/catalogos/personas',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-giros',
                    'label': 'Giros',
                    'url': '/catalogos/giros',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-zonificaciones',
                    'label': 'Zonificaciones',
                    'url': '/catalogos/zonificaciones',
                    'submenues': [],
                },
                {
                    'id': 'catalogos-tipos-procedimiento-tupa',
                    'label': 'Tipo de procedimiento TUPA',
                    'url': '/catalogos/tipos-procedimiento-tupa',
                    'submenues': [],
                },
            ],
        })

    # --- Usuarios ---
    if opciones['admin']:
        menus.append({
            'id': 'usuarios',
            'label': 'Usuarios',
            'url': '/usuarios',
            'submenues': [],
        })

    return menus
