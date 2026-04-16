import logging

from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Persona
from .serializers import (
    ExpedienteCreateSerializer,
    ExpedienteSerializer,
    PersonaSerializer,
    PersonaWriteSerializer,
    TipoDocumentoIdentidadSerializer,
    TipoProcedimientoTupaSerializer,
    TipoProcedimientoTupaWriteSerializer,
)
from .services.expediente import (
    buscar_expedientes_con_plazo,
    crear_expediente,
    listar_expedientes_pendientes_con_plazo,
)
from .services.persona import (
    DocumentoDuplicadoError,
    actualizar_persona,
    buscar_personas,
    crear_persona,
    eliminar_persona,
    listar_personas,
    obtener_persona,
)
from .services.tipo_documento_identidad import listar_tipos_documento_identidad
from .services.reniec import ReniecError, consultar_por_dni
from .services.sunat import SunatError, consultar_por_ruc
from .services.tipo_procedimiento_tupa import (
    actualizar_tipo_procedimiento_tupa,
    crear_tipo_procedimiento_tupa,
    eliminar_tipo_procedimiento_tupa,
    listar_tipos_procedimiento_tupa,
    obtener_tipo_procedimiento_tupa,
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


class TipoProcedimientoTupaListView(APIView):
    """
    GET  /api/lf-itse/tipos-procedimiento-tupa/
        Lista todos los tipos de procedimiento TUPA.

    POST /api/lf-itse/tipos-procedimiento-tupa/
        Crea un nuevo tipo de procedimiento TUPA.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            tipos = listar_tipos_procedimiento_tupa()
            serializer = TipoProcedimientoTupaSerializer(tipos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al listar tipos de procedimiento TUPA')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        try:
            serializer = TipoProcedimientoTupaWriteSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            tipo = crear_tipo_procedimiento_tupa(
                data=serializer.validated_data,
                usuario=request.user,
            )
            return Response(
                TipoProcedimientoTupaSerializer(tipo).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.exception('Error al crear tipo de procedimiento TUPA')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TipoProcedimientoTupaDetailView(APIView):
    """
    GET    /api/lf-itse/tipos-procedimiento-tupa/<pk>/
        Retorna un tipo de procedimiento TUPA específico.

    PUT    /api/lf-itse/tipos-procedimiento-tupa/<pk>/
        Actualiza un tipo de procedimiento TUPA.

    DELETE /api/lf-itse/tipos-procedimiento-tupa/<pk>/
        Elimina físicamente un tipo de procedimiento TUPA.
        Retorna 409 si tiene expedientes asociados.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            tipo = obtener_tipo_procedimiento_tupa(pk)
            return Response(
                TipoProcedimientoTupaSerializer(tipo).data,
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception('Error al obtener tipo de procedimiento TUPA pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, pk):
        try:
            serializer = TipoProcedimientoTupaWriteSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            tipo = actualizar_tipo_procedimiento_tupa(pk, serializer.validated_data)
            return Response(
                TipoProcedimientoTupaSerializer(tipo).data,
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception('Error al actualizar tipo de procedimiento TUPA pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, pk):
        try:
            eliminar_tipo_procedimiento_tupa(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except ProtectedError:
            return Response(
                {'error': 'No se puede eliminar: el registro tiene expedientes asociados.'},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al eliminar tipo de procedimiento TUPA pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PersonaListCreateView(APIView):
    """
    GET  /api/lf-itse/personas/
        Lista todas las personas con sus documentos.

    POST /api/lf-itse/personas/
        Crea una nueva persona junto con sus documentos de identidad.
        Verifica que ningún documento esté ya asignado a otra persona.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            personas = listar_personas()
            serializer = PersonaSerializer(personas, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al listar personas')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request):
        serializer = PersonaWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            persona = crear_persona(
                data=serializer.validated_data,
                usuario=request.user,
            )
            return Response(
                PersonaSerializer(persona).data,
                status=status.HTTP_201_CREATED,
            )

        except DocumentoDuplicadoError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al crear persona')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PersonaDetailView(APIView):
    """
    GET    /api/lf-itse/personas/<pk>/
        Retorna una persona con sus documentos.

    PUT    /api/lf-itse/personas/<pk>/
        Actualiza una persona y reemplaza todos sus documentos.

    DELETE /api/lf-itse/personas/<pk>/
        Elimina físicamente la persona y sus documentos (CASCADE).

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            persona = obtener_persona(pk)
            return Response(
                PersonaSerializer(persona).data,
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception('Error al obtener persona pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request, pk):
        serializer = PersonaWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            persona = actualizar_persona(pk, serializer.validated_data)
            return Response(
                PersonaSerializer(persona).data,
                status=status.HTTP_200_OK,
            )

        except DocumentoDuplicadoError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al actualizar persona pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, pk):
        try:
            eliminar_persona(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.exception('Error al eliminar persona pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PersonasBuscarView(APIView):
    """
    GET /api/lf-itse/personas/buscar/?filtro=<FILTRO>&valor=<VALOR>

    Busca personas según el filtro y valor indicados.
    Retorna una fila por persona con todos sus documentos de identidad
    concatenados en el campo ``documento_concatenado``.

    Parámetros de query string
    --------------------------
    filtro : str  (obligatorio)
        NOMBRE | DOCUMENTO | ID
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

            resultados = buscar_personas(filtro, valor)
            return Response(resultados, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.exception('Error al buscar personas (filtro=%s)', filtro)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TipoDocumentoIdentidadListView(APIView):
    """
    GET /api/lf-itse/tipos-documento-identidad/?tipo_persona=<N|J>

    Retorna los tipos de documento de identidad disponibles según el
    tipo de persona indicado.

    Parámetros de query string
    --------------------------
    tipo_persona : str  (obligatorio)
        'N' → documentos para persona natural
        'J' → documentos para persona jurídica

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        tipo_persona = request.query_params.get('tipo_persona', '').strip()

        if not tipo_persona:
            return Response(
                {'error': "El parámetro 'tipo_persona' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tipos = listar_tipos_documento_identidad(tipo_persona)
            serializer = TipoDocumentoIdentidadSerializer(tipos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PersonaSexosView(APIView):
    """
    GET /api/lf-itse/personas/sexos/

    Retorna los valores disponibles para el campo sexo de Persona.
    Útil para poblar listas desplegables en el frontend.

    Respuesta de ejemplo:
        [
            {"value": "M", "label": "Masculino"},
            {"value": "F", "label": "Femenino"},
            {"value": "X", "label": "Prefiero no decirlo"}
        ]

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        sexos = [
            {'value': value, 'label': label}
            for value, label in Persona.Sexo.choices
        ]
        return Response(sexos, status=status.HTTP_200_OK)


class ReniecConsultarView(APIView):
    """
    GET /api/lf-itse/reniec/consultar/?dni=<DNI>

    Consulta los datos de una persona en RENIEC a través de la
    plataforma PIDE.

    Parámetros de query string
    --------------------------
    dni : str  (obligatorio)
        Número de DNI a consultar (8 dígitos numéricos).

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        dni = request.query_params.get('dni', '').strip()

        if not dni:
            return Response(
                {'error': "El parámetro 'dni' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = consultar_por_dni(dni)
            return Response(resultado, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ReniecError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception as e:
            logger.exception('Error al consultar RENIEC (dni=%s)', dni)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class SunatConsultarView(APIView):
    """
    GET /api/lf-itse/sunat/consultar/?ruc=<RUC>

    Consulta los datos principales de un contribuyente en SUNAT a través
    de la plataforma PIDE.

    Parámetros de query string
    --------------------------
    ruc : str  (obligatorio)
        Número de RUC a consultar (11 dígitos numéricos).

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        ruc = request.query_params.get('ruc', '').strip()

        if not ruc:
            return Response(
                {'error': "El parámetro 'ruc' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = consultar_por_ruc(ruc)
            return Response(resultado, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except SunatError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception as e:
            logger.exception('Error al consultar SUNAT (ruc=%s)', ruc)
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
