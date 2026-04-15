import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ExpedienteCreateSerializer, ExpedienteSerializer
from .services.expediente import (
    buscar_expedientes_con_plazo,
    crear_expediente,
    listar_expedientes_pendientes_con_plazo,
)
from .services.usuario import construir_menu_usuario

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


class ExpedientesBuscarView(APIView):
    """
    GET /api/lf-itse/expedientes/buscar/?filtro=<FILTRO>&valor=<VALOR>

    Busca expedientes según el filtro y valor indicados.
    Incluye ``dias_habiles_restantes`` para cada resultado.

    Parámetros de query string
    --------------------------
    filtro : str  (obligatorio)
        NUMERO | FECHA_RECEPCION | FECHA_VENCIMIENTO |
        NOMBRE_SOLICITANTE | RUC_SOLICITANTE
    valor  : str  (obligatorio)
        Valor a buscar según el filtro elegido.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            filtro = request.query_params.get('filtro', '').strip()
            valor  = request.query_params.get('valor',  '').strip()

            if not filtro:
                return Response(
                    {'error': "El parámetro 'filtro' es obligatorio."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not valor:
                return Response(
                    {'error': "El parámetro 'valor' es obligatorio."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            resultados = buscar_expedientes_con_plazo(filtro, valor)
            return Response(resultados, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.exception('Error al buscar expedientes (filtro=%s)', filtro)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MenuUsuarioView(APIView):
    """
    GET /api/lf-itse/usuarios/menus/

    Retorna la estructura de menús a los que tiene acceso el usuario autenticado.
    El user.id se obtiene del token JWT; no se requiere ningún parámetro en la URL.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            menus = construir_menu_usuario(request.user.id)
            return Response(menus, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al construir menú del usuario %s', request.user.id)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
