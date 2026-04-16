from django.urls import path

from .views import (
    ExpedienteCreateView,
    ExpedientesBuscarView,
    ExpedientesPendientesView,
    MenuUsuarioView,
    PersonasBuscarView,
    ReniecConsultarView,
    TipoProcedimientoTupaDetailView,
    TipoProcedimientoTupaListView,
)

app_name = 'lf_itse'

urlpatterns = [
    # Expedientes
    path('expedientes/', ExpedienteCreateView.as_view(), name='expediente-create'),
    path('expedientes/pendientes/', ExpedientesPendientesView.as_view(), name='expediente-pendientes'),
    path('expedientes/buscar/', ExpedientesBuscarView.as_view(), name='expediente-buscar'),

    # Personas
    path('personas/buscar/', PersonasBuscarView.as_view(), name='persona-buscar'),

    # Tipos de procedimiento TUPA
    path('tipos-procedimiento-tupa/', TipoProcedimientoTupaListView.as_view(), name='tipo-procedimiento-tupa-list'),
    path('tipos-procedimiento-tupa/<int:pk>/', TipoProcedimientoTupaDetailView.as_view(), name='tipo-procedimiento-tupa-detail'),

    # RENIEC / PIDE
    path('reniec/consultar/', ReniecConsultarView.as_view(), name='reniec-consultar'),

    # Usuarios
    path('usuarios/menus/', MenuUsuarioView.as_view(), name='usuario-menus'),
]
