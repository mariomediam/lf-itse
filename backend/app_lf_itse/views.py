from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ExpedienteCreateSerializer, ExpedienteSerializer
from .services.expediente import crear_expediente


class ExpedienteCreateView(APIView):
    """
    POST /api/lf-itse/expedientes/

    Crea un nuevo expediente.
    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer_in = ExpedienteCreateSerializer(data=request.data)
        serializer_in.is_valid(raise_exception=True)

        expediente = crear_expediente(
            data=serializer_in.validated_data,
            usuario=request.user,
        )

        serializer_out = ExpedienteSerializer(expediente)
        return Response(serializer_out.data, status=status.HTTP_201_CREATED)
