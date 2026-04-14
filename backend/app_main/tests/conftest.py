"""
Fixtures compartidas para todos los tests
"""
import pytest
from rest_framework.test import APIClient
from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken
from decimal import Decimal

from app_main.models import Product


@pytest.fixture
def api_client():
    """Cliente de API para hacer peticiones"""
    return APIClient()


@pytest.fixture
def user(db):
    """Usuario de prueba"""
    return User.objects.create_user(
        username='testuser',
        password='testpass123',
        email='test@example.com'
    )


@pytest.fixture
def admin_user(db):
    """Usuario administrador de prueba"""
    return User.objects.create_superuser(
        username='admin',
        password='admin123',
        email='admin@example.com'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Cliente autenticado con JWT"""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """Cliente autenticado como admin"""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return api_client


@pytest.fixture
def product(db):
    """Producto de prueba"""
    return Product.objects.create(
        name="Test Product",
        description="Test Description",
        price=Decimal("99.99")
    )


@pytest.fixture
def product_list(db):
    """Lista de productos de prueba"""
    products = []
    for i in range(5):
        products.append(
            Product.objects.create(
                name=f"Product {i+1}",
                description=f"Description {i+1}",
                price=Decimal(f"{(i+1)*100}.99")
            )
        )
    return products


@pytest.fixture
def product_data():
    """Datos válidos para crear un producto"""
    return {
        'name': 'New Product',
        'description': 'New Description',
        'price': 199.99
    }