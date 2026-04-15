from django.urls import path

from .views import ExpedienteCreateView, ExpedientesPendientesView

app_name = 'lf_itse'

urlpatterns = [
    # Expedientes
    path('expedientes/', ExpedienteCreateView.as_view(), name='expediente-create'),
    path('expedientes/pendientes/', ExpedientesPendientesView.as_view(), name='expediente-pendientes'),
]
