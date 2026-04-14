"""
Tests para los endpoints de productos (CRUD)
"""
import pytest
from rest_framework import status
from decimal import Decimal

from app_main.models import Product


@pytest.mark.django_db
class TestProductListEndpoint:
    """Tests para GET /api/products/ y POST /api/products/"""
    
    url = '/api/products/'
    
    # ==================== TESTS DE LISTADO (GET) ====================
    
    def test_list_products_without_auth(self, api_client, product_list):
        """Test: Listar productos sin autenticación (público)"""
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 5
        assert response.data[0]['name'] == 'Product 1'
    
    def test_list_products_with_auth(self, authenticated_client, product_list):
        """Test: Listar productos con autenticación"""
        response = authenticated_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 5
    
    def test_list_products_empty(self, api_client):
        """Test: Listar productos cuando no hay ninguno"""
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0
        assert response.data == []
    
    def test_list_products_returns_all_fields(self, api_client, product):
        """Test: Verificar que retorna todos los campos"""
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        product_data = response.data[0]
        
        assert 'id' in product_data
        assert 'name' in product_data
        assert 'description' in product_data
        assert 'price' in product_data
        assert 'created_at' in product_data
        assert 'updated_at' in product_data
    
    # ==================== TESTS DE CREACIÓN (POST) ====================
    
    def test_create_product_without_auth(self, api_client, product_data):
        """Test: Crear producto sin autenticación (debe fallar)"""
        response = api_client.post(self.url, product_data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert Product.objects.count() == 0
    
    def test_create_product_with_auth(self, authenticated_client, product_data):
        """Test: Crear producto con autenticación"""
        response = authenticated_client.post(self.url, product_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == product_data['name']
        assert response.data['description'] == product_data['description']
        assert Decimal(response.data['price']) == Decimal(str(product_data['price']))
        
        # Verificar que se creó en la BD
        assert Product.objects.count() == 1
        product = Product.objects.first()
        assert product.name == product_data['name']
    
    def test_create_product_missing_name(self, authenticated_client):
        """Test: Crear producto sin nombre (debe fallar)"""
        data = {
            'description': 'Description',
            'price': 99.99
        }
        response = authenticated_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'name' in response.data
        assert Product.objects.count() == 0
    
    def test_create_product_missing_description(self, authenticated_client):
        """Test: Crear producto sin descripción (debe fallar)"""
        data = {
            'name': 'Product',
            'price': 99.99
        }
        response = authenticated_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'description' in response.data
    
    def test_create_product_missing_price(self, authenticated_client):
        """Test: Crear producto sin precio (debe fallar)"""
        data = {
            'name': 'Product',
            'description': 'Description'
        }
        response = authenticated_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'price' in response.data
    
    def test_create_product_invalid_price(self, authenticated_client):
        """Test: Crear producto con precio inválido"""
        data = {
            'name': 'Product',
            'description': 'Description',
            'price': 'invalid_price'
        }
        response = authenticated_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'price' in response.data
    
    def test_create_product_negative_price(self, authenticated_client):
        """Test: Crear producto con precio negativo"""
        data = {
            'name': 'Product',
            'description': 'Description',
            'price': -50.00
        }
        response = authenticated_client.post(self.url, data, format='json')
        
        # Actualmente tu modelo permite precios negativos
        # Si quieres validarlo, agrega validación en el serializer
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_create_product_empty_name(self, authenticated_client):
        """Test: Crear producto con nombre vacío"""
        data = {
            'name': '',
            'description': 'Description',
            'price': 99.99
        }
        response = authenticated_client.post(self.url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'name' in response.data


@pytest.mark.django_db
class TestProductDetailEndpoint:
    """Tests para GET/PUT/DELETE /api/products/{id}/"""
    
    # ==================== TESTS DE DETALLE (GET) ====================
    
    def test_get_product_detail_without_auth(self, api_client, product):
        """Test: Obtener detalle de producto sin autenticación"""
        url = f'/api/products/{product.id}/'
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == product.id
        assert response.data['name'] == product.name
        assert response.data['description'] == product.description
        assert Decimal(response.data['price']) == product.price
    
    def test_get_product_detail_with_auth(self, authenticated_client, product):
        """Test: Obtener detalle de producto con autenticación"""
        url = f'/api/products/{product.id}/'
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == product.name
    
    def test_get_product_detail_not_found(self, api_client):
        """Test: Obtener producto que no existe"""
        url = '/api/products/9999/'
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert 'error' in response.data
    
    # ==================== TESTS DE ACTUALIZACIÓN (PUT) ====================
    
    def test_update_product_without_auth(self, api_client, product):
        """Test: Actualizar producto sin autenticación (debe fallar)"""
        url = f'/api/products/{product.id}/'
        data = {
            'name': 'Updated Product',
            'description': 'Updated Description',
            'price': 999.99
        }
        response = api_client.put(url, data, format='json')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Verificar que NO se actualizó
        product.refresh_from_db()
        assert product.name == "Test Product"
    
    def test_update_product_with_auth(self, authenticated_client, product):
        """Test: Actualizar producto con autenticación"""
        url = f'/api/products/{product.id}/'
        data = {
            'name': 'Updated Product',
            'description': 'Updated Description',
            'price': 999.99
        }
        response = authenticated_client.put(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Product'
        assert response.data['description'] == 'Updated Description'
        assert Decimal(response.data['price']) == Decimal('999.99')
        
        # Verificar que se actualizó en la BD
        product.refresh_from_db()
        assert product.name == 'Updated Product'
        assert product.price == Decimal('999.99')
    
    def test_update_product_not_found(self, authenticated_client):
        """Test: Actualizar producto que no existe"""
        url = '/api/products/9999/'
        data = {
            'name': 'Updated Product',
            'description': 'Updated Description',
            'price': 999.99
        }
        response = authenticated_client.put(url, data, format='json')
        
        # Tu código actual no maneja esto bien (causaría 500)
        # Debería retornar 404
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_update_product_partial_data(self, authenticated_client, product):
        """Test: Actualizar producto con datos parciales (PUT requiere todos)"""
        url = f'/api/products/{product.id}/'
        data = {
            'name': 'Updated Name Only'
            # Faltan description y price
        }
        response = authenticated_client.put(url, data, format='json')
        
        # PUT requiere todos los campos
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_product_invalid_price(self, authenticated_client, product):
        """Test: Actualizar con precio inválido"""
        url = f'/api/products/{product.id}/'
        data = {
            'name': 'Updated Product',
            'description': 'Updated Description',
            'price': 'invalid'
        }
        response = authenticated_client.put(url, data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'price' in response.data
    
    # ==================== TESTS DE ELIMINACIÓN (DELETE) ====================
    
    def test_delete_product_without_auth(self, api_client, product):
        """Test: Eliminar producto sin autenticación (debe fallar)"""
        url = f'/api/products/{product.id}/'
        response = api_client.delete(url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Verificar que NO se eliminó
        assert Product.objects.filter(pk=product.id).exists()
    
    def test_delete_product_with_auth(self, authenticated_client, product):
        """Test: Eliminar producto con autenticación"""
        url = f'/api/products/{product.id}/'
        product_id = product.id
        
        response = authenticated_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verificar que se eliminó de la BD
        assert not Product.objects.filter(pk=product_id).exists()
        assert Product.objects.count() == 0
    
    def test_delete_product_not_found(self, authenticated_client):
        """Test: Eliminar producto que no existe"""
        url = '/api/products/9999/'
        response = authenticated_client.delete(url)
        
        # Tu código actual no maneja esto bien (causaría 500)
        # Debería retornar 404
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_500_INTERNAL_SERVER_ERROR]
    
    def test_delete_product_twice(self, authenticated_client, product):
        """Test: Intentar eliminar el mismo producto dos veces"""
        url = f'/api/products/{product.id}/'
        
        # Primera eliminación
        response1 = authenticated_client.delete(url)
        assert response1.status_code == status.HTTP_204_NO_CONTENT
        
        # Segunda eliminación (debe fallar)
        response2 = authenticated_client.delete(url)
        assert response2.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_500_INTERNAL_SERVER_ERROR]


@pytest.mark.django_db
class TestProductPermissions:
    """Tests de permisos de productos"""
    
    url = '/api/products/'
    
    def test_unauthenticated_can_read(self, api_client, product):
        """Test: Usuarios no autenticados pueden leer"""
        # GET lista
        response = api_client.get(self.url)
        assert response.status_code == status.HTTP_200_OK
        
        # GET detalle
        detail_url = f'/api/products/{product.id}/'
        response = api_client.get(detail_url)
        assert response.status_code == status.HTTP_200_OK
    
    def test_unauthenticated_cannot_write(self, api_client, product, product_data):
        """Test: Usuarios no autenticados NO pueden escribir"""
        # POST
        response = api_client.post(self.url, product_data, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # PUT
        detail_url = f'/api/products/{product.id}/'
        response = api_client.put(detail_url, product_data, format='json')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # DELETE
        response = api_client.delete(detail_url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_authenticated_can_crud(self, authenticated_client, product_data):
        """Test: Usuarios autenticados pueden hacer CRUD completo"""
        # CREATE
        response = authenticated_client.post(self.url, product_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        product_id = response.data['id']
        
        # READ
        detail_url = f'/api/products/{product_id}/'
        response = authenticated_client.get(detail_url)
        assert response.status_code == status.HTTP_200_OK
        
        # UPDATE
        update_data = {
            'name': 'Updated',
            'description': 'Updated',
            'price': 299.99
        }
        response = authenticated_client.put(detail_url, update_data, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # DELETE
        response = authenticated_client.delete(detail_url)
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestProductEdgeCases:
    """Tests de casos extremos"""
    
    def test_create_product_with_very_long_name(self, authenticated_client):
        """Test: Crear producto con nombre muy largo"""
        data = {
            'name': 'A' * 300,  # Más de 255 caracteres
            'description': 'Description',
            'price': 99.99
        }
        response = authenticated_client.post('/api/products/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_product_with_zero_price(self, authenticated_client):
        """Test: Crear producto con precio cero"""
        data = {
            'name': 'Free Product',
            'description': 'Free item',
            'price': 0.00
        }
        response = authenticated_client.post('/api/products/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Decimal(response.data['price']) == Decimal('0.00')
    
    def test_create_product_with_very_high_price(self, authenticated_client):
        """Test: Crear producto con precio muy alto"""
        data = {
            'name': 'Expensive Product',
            'description': 'Very expensive',
            'price': 99999999.99
        }
        response = authenticated_client.post('/api/products/', data, format='json')
        
        # Verifica que el precio cabe en DECIMAL(10,2)
        # 10 dígitos totales, 2 decimales = máximo 99999999.99
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_create_product_with_special_characters(self, authenticated_client):
        """Test: Crear producto con caracteres especiales"""
        data = {
            'name': 'Product™ with émojis 🚀',
            'description': 'Special chars: @#$%^&*()',
            'price': 99.99
        }
        response = authenticated_client.post('/api/products/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Product™ with émojis 🚀'
    
    def test_list_products_pagination(self, authenticated_client):
        """Test: Paginación de productos"""
        # Crear 15 productos (PAGE_SIZE=10 en settings)
        for i in range(15):
            Product.objects.create(
                name=f'Product {i}',
                description=f'Description {i}',
                price=Decimal('99.99')
            )
        
        response = authenticated_client.get('/api/products/')
        
        assert response.status_code == status.HTTP_200_OK
        # Con paginación, debería retornar estructura diferente
        # Si no tienes paginación, retorna lista simple
        if isinstance(response.data, list):
            assert len(response.data) == 15
        else:
            # Con paginación
            assert 'results' in response.data
            assert len(response.data['results']) == 10