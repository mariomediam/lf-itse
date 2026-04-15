import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ExpedienteCreateSerializer, ExpedienteSerializer
from .services.expediente import crear_expediente, listar_expedientes_pendientes_con_plazo

logger = logging.getLogger(__name__)


class ExpedienteCreateView(APIView):
    """
    POST /api/lf-itse/expedientes/

    Crea un nuevo expediente.
    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer_in = ExpedienteCreateSerializer(data=request.data)
            serializer_in.is_valid(raise_exception=True)

            expediente = crear_expediente(
                data=serializer_in.validated_data,
                usuario=request.user,
            )

            serializer_out = ExpedienteSerializer(expediente)
            return Response(serializer_out.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.exception('Error al crear expediente')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExpedientesPendientesView(APIView):
    """
    GET /api/lf-itse/expedientes/pendientes/

    Lista todos los expedientes con al menos una autorización pendiente
    (LF o ITSE), incluyendo los días hábiles restantes hasta el vencimiento.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            pendientes = listar_expedientes_pendientes_con_plazo()
            return Response(pendientes, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al listar expedientes pendientes')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
