from django.shortcuts import render
from rest_framework.permissions import AllowAny, IsAuthenticated

# Create your views here. with ApiView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Product
from .serializers import ProductSerializer

class ProductView(APIView):


    def get_permissions(self):
        """
        Permisos personalizados por método
        """
        if self.request.method == 'GET':
            # GET público
            return [AllowAny()]
        else:
            # POST, PUT, DELETE requieren autenticación
            return [IsAuthenticated()]

    def get(self, request, pk=None):
        if pk:
            # Obtener un producto específico
            try:
                product = Product.objects.get(pk=pk)
                serializer = ProductSerializer(product)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Product.DoesNotExist:
                return Response(
                    {"error": "Producto no encontrado"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Listar todos los productos
            products = Product.objects.all()
            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)  # ← AGREGAR ESTO


    def post(self, request):
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response(
                {"error": "Producto no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductSerializer(product, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, pk):
        try:
            product = Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            return Response(
                {"error": "Producto no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        product.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
        