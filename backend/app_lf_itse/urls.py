from django.urls import path

from .views import ExpedienteCreateView, ExpedientesBuscarView, ExpedientesPendientesView, MenuUsuarioView

app_name = 'lf_itse'

urlpatterns = [
    # Expedientes
    path('expedientes/', ExpedienteCreateView.as_view(), name='expediente-create'),
    path('expedientes/pendientes/', ExpedientesPendientesView.as_view(), name='expediente-pendientes'),
    path('expedientes/buscar/', ExpedientesBuscarView.as_view(), name='expediente-buscar'),

    # Usuarios
    path('usuarios/menus/', MenuUsuarioView.as_view(), name='usuario-menus'),
]
