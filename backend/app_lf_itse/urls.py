from django.urls import path

from .views import (
    DenegarLicenciaView,
    ExpedienteAmpliacionPlazoView,
    ExpedienteCreateView,
    ExpedientesBuscarView,
    ExpedientesPendientesView,
    MenuUsuarioView,
    PersonaDetailView,
    PersonaListCreateView,
    PersonasBuscarView,
    PersonaSexosView,
    ReniecConsultarView,
    SunatConsultarView,
    TipoDocumentoIdentidadListView,
    TipoProcedimientoTupaDetailView,
    TipoProcedimientoTupaListView,
)

app_name = 'lf_itse'

urlpatterns = [
    # Expedientes
    path('expedientes/', ExpedienteCreateView.as_view(), name='expediente-create'),
    path('expedientes/pendientes/', ExpedientesPendientesView.as_view(), name='expediente-pendientes'),
    path('expedientes/buscar/', ExpedientesBuscarView.as_view(), name='expediente-buscar'),
    path('expedientes/<int:pk>/ampliacion-plazo/', ExpedienteAmpliacionPlazoView.as_view(), name='expediente-ampliacion-plazo'),
    path('expedientes/<int:pk>/denegar-licencia/', DenegarLicenciaView.as_view(), name='expediente-denegar-licencia'),

    # Personas
    path('personas/',        PersonaListCreateView.as_view(), name='persona-list-create'),
    path('personas/<int:pk>/', PersonaDetailView.as_view(),   name='persona-detail'),
    path('personas/buscar/', PersonasBuscarView.as_view(),   name='persona-buscar'),
    path('personas/sexos/',  PersonaSexosView.as_view(),     name='persona-sexos'),

    # Tipos de documento de identidad
    path('tipos-documento-identidad/', TipoDocumentoIdentidadListView.as_view(), name='tipo-documento-identidad-list'),

    # Tipos de procedimiento TUPA
    path('tipos-procedimiento-tupa/', TipoProcedimientoTupaListView.as_view(), name='tipo-procedimiento-tupa-list'),
    path('tipos-procedimiento-tupa/<int:pk>/', TipoProcedimientoTupaDetailView.as_view(), name='tipo-procedimiento-tupa-detail'),

    # RENIEC / PIDE
    path('reniec/consultar/', ReniecConsultarView.as_view(), name='reniec-consultar'),

    # SUNAT / PIDE
    path('sunat/consultar/', SunatConsultarView.as_view(), name='sunat-consultar'),

    # Usuarios
    path('usuarios/menus/', MenuUsuarioView.as_view(), name='usuario-menus'),
]
