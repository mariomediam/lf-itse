"""
Tests para ProductSerializer
"""
import pytest
from decimal import Decimal

from app_main.models import Product
from app_main.serializers import ProductSerializer


@pytest.mark.django_db
class TestProductSerializer:
    """Tests del serializer de Product"""
    
    def test_serialize_product(self, product):
        """Test: Serializar un producto"""
        serializer = ProductSerializer(product)
        data = serializer.data
        
        assert data['id'] == product.id
        assert data['name'] == product.name
        assert data['description'] == product.description
        assert Decimal(data['price']) == product.price
        assert 'created_at' in data
        assert 'updated_at' in data
    
    def test_serialize_product_list(self, product_list):
        """Test: Serializar lista de productos"""
        serializer = ProductSerializer(product_list, many=True)
        data = serializer.data
        
        assert len(data) == 5
        assert data[0]['name'] == 'Product 1'
        assert data[4]['name'] == 'Product 5'
    
    def test_deserialize_valid_data(self, product_data):
        """Test: Deserializar datos válidos"""
        serializer = ProductSerializer(data=product_data)
        
        assert serializer.is_valid()
        product = serializer.save()
        
        assert product.name == product_data['name']
        assert product.description == product_data['description']
        assert product.price == Decimal(str(product_data['price']))
    
    def test_deserialize_missing_name(self):
        """Test: Deserializar sin campo name"""
        data = {
            'description': 'Description',
            'price': 99.99
        }
        serializer = ProductSerializer(data=data)
        
        assert not serializer.is_valid()
        assert 'name' in serializer.errors
    
    def test_deserialize_missing_price(self):
        """Test: Deserializar sin campo price"""
        data = {
            'name': 'Product',
            'description': 'Description'
        }
        serializer = ProductSerializer(data=data)
        
        assert not serializer.is_valid()
        assert 'price' in serializer.errors
    
    def test_deserialize_invalid_price(self):
        """Test: Deserializar con precio inválido"""
        data = {
            'name': 'Product',
            'description': 'Description',
            'price': 'invalid'
        }
        serializer = ProductSerializer(data=data)
        
        assert not serializer.is_valid()
        assert 'price' in serializer.errors
    
    def test_update_product(self, product):
        """Test: Actualizar un producto existente"""
        update_data = {
            'name': 'Updated Product',
            'description': 'Updated Description',
            'price': 199.99
        }
        serializer = ProductSerializer(product, data=update_data)
        
        assert serializer.is_valid()
        updated_product = serializer.save()
        
        assert updated_product.id == product.id
        assert updated_product.name == 'Updated Product'
        assert updated_product.price == Decimal('199.99')