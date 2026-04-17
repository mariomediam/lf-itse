"""
URL configuration for backend_api project.
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework import routers

# Router principal
router = routers.DefaultRouter()

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Router principal
    path('api/', include(router.urls)),
    
    # Djoser authentication endpoints
    path('api/auth/', include('djoser.urls')),
    path('api/auth/', include('djoser.urls.jwt')),
    
    # DRF browsable API login
    path('api-auth/', include('rest_framework.urls')),
    
    # App endpoints
    path('api/', include('app_main.urls')),
    path('api/lf-itse/', include('app_lf_itse.urls')),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)