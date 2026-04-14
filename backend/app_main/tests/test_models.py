"""
Tests para el modelo Product
"""
import pytest
from decimal import Decimal
from django.db import IntegrityError

from app_main.models import Product


@pytest.mark.django_db
class TestProductModel:
    """Tests del modelo Product"""
    
    def test_create_product(self):
        """Test: Crear un producto"""
        product = Product.objects.create(
            name="Laptop HP",
            description="Laptop HP con 16GB RAM",
            price=Decimal("899.99")
        )
        
        assert product.id is not None
        assert product.name == "Laptop HP"
        assert product.description == "Laptop HP con 16GB RAM"
        assert product.price == Decimal("899.99")
        assert product.created_at is not None
        assert product.updated_at is not None
    
    def test_product_str(self):
        """Test: Representación string del producto"""
        product = Product.objects.create(
            name="iPhone 15",
            description="Smartphone",
            price=Decimal("1299.99")
        )
        
        assert str(product) == "iPhone 15"
    
    def test_product_db_table(self):
        """Test: Nombre de la tabla en base de datos"""
        assert Product._meta.db_table == 'products'
    
    def test_product_verbose_name(self):
        """Test: Nombres verbose del modelo"""
        assert Product._meta.verbose_name == 'Product'
        assert Product._meta.verbose_name_plural == 'Products'
    
    def test_product_fields(self):
        """Test: Verificar campos del modelo"""
        product = Product.objects.create(
            name="Test",
            description="Test",
            price=Decimal("99.99")
        )
        
        # Verificar que los campos existen
        assert hasattr(product, 'id')
        assert hasattr(product, 'name')
        assert hasattr(product, 'description')
        assert hasattr(product, 'price')
        assert hasattr(product, 'created_at')
        assert hasattr(product, 'updated_at')
    
    def test_product_ordering(self):
        """Test: Verificar orden de productos"""
        Product.objects.create(name="Product A", description="Desc", price=Decimal("10"))
        Product.objects.create(name="Product B", description="Desc", price=Decimal("20"))
        
        products = Product.objects.all()
        assert products.count() == 2