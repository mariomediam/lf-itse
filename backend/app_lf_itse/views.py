import logging

import mimetypes

from django.core.files.storage import default_storage
from django.db.models import ProtectedError
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Expediente, ExpedienteArchivo, Persona
from .serializers import (
    AmpliacionPlazoSerializer,
    AutorizacionImprocedenteSerializer,
    DenegarLicenciaSerializer,
    ExpedienteArchivoSerializer,
    ExpedienteArchivoUploadSerializer,
    ExpedienteCreateSerializer,
    ExpedienteSerializer,
    ExpedienteUpdateSerializer,
    GiroSerializer,
    LicenciaFuncionamientoCreateSerializer,
    LicenciaFuncionamientoInactivarSerializer,
    LicenciaFuncionamientoNotificacionSerializer,
    LicenciaFuncionamientoUpdateSerializer,
    NivelRiesgoSerializer,
    TipoLicenciaSerializer,
    ZonificacionSerializer,
    PersonaSerializer,
    PersonaWriteSerializer,
    TipoDocumentoIdentidadSerializer,
    TipoProcedimientoTupaSerializer,
    TipoProcedimientoTupaWriteSerializer,
)
from .services.expediente import (
    ExpedienteConItseError,
    ExpedienteConLicenciaError,
    ExpedienteDuplicadoError,
    actualizar_expediente,
    ampliar_plazo_expediente,
    buscar_expedientes_con_plazo,
    crear_expediente,
    eliminar_expediente,
    listar_expedientes_pendientes_con_plazo,
)
from .services.licencia_funcionamiento import (
    EstadoInactivacionDuplicadoError,
    LicenciaDenegadaError,
    LicenciaDuplicadaError,
    NotificacionFechaInvalidaError,
    ReciboPagoDuplicadoError,
    buscar_licencias,
    crear_licencia,
    modificar_licencia,
    registrar_inactivacion_licencia,
    registrar_notificacion,
    verificar_numero_expediente_para_licencia,
)
from .services.estado import listar_estados_inactivos_para_lf
from .services.giro import buscar_giros, listar_giros_por_licencia
from .services.nivel_riesgo import listar_niveles_riesgo
from .services.tipo_licencia import listar_tipos_licencia
from .services.zonificacion import listar_zonificaciones
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
from .services.expediente_archivo import eliminar_archivo_expediente, subir_archivo_expediente
from .services.autorizacion_improcedente import (
    ItseYaEmitidaError,
    LicenciaYaEmitidaError,
    denegar_itse,
    denegar_licencia_funcionamiento,
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

        except ExpedienteDuplicadoError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al crear expediente')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExpedienteUpdateView(APIView):
    """
    PUT /api/lf-itse/expedientes/<pk>/

    Modifica un expediente existente y recalcula sus fechas de vencimiento
    y alerta.  Si el expediente ya tiene una ampliación de plazo registrada,
    los días de ampliación se aplican sobre la nueva fecha base calculada.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            serializer_in = ExpedienteUpdateSerializer(data=request.data)
            serializer_in.is_valid(raise_exception=True)

            expediente = actualizar_expediente(
                pk=pk,
                data=serializer_in.validated_data,
            )

            serializer_out = ExpedienteSerializer(expediente)
            return Response(serializer_out.data, status=status.HTTP_200_OK)

        except ExpedienteDuplicadoError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al actualizar expediente')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request, pk):
        try:
            eliminar_expediente(pk=pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except ExpedienteConLicenciaError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except ExpedienteConItseError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al eliminar expediente pk=%s', pk)
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


class ExpedienteAmpliacionPlazoView(APIView):
    """
    POST /api/lf-itse/expedientes/<pk>/ampliacion-plazo/

    Registra la ampliación de plazo de un expediente y recalcula
    sus fechas de vencimiento y alerta.

    Parámetros de URL
    -----------------
    pk : int  — id del expediente a ampliar.

    Body (JSON)
    -----------
    {
        "fecha_suspension"  : "YYYY-MM-DD",
        "dias_ampliacion"   : <entero positivo>,
        "motivo_ampliacion" : "<texto>"
    }

    Retorna
    -------
    200 OK  — el expediente completo con los campos actualizados.
    400     — datos inválidos.
    404     — expediente no encontrado.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = AmpliacionPlazoSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            expediente = ampliar_plazo_expediente(pk, serializer.validated_data, request.user)
            return Response(
                ExpedienteSerializer(expediente).data,
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.exception('Error al ampliar plazo del expediente pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExpedienteArchivoUploadView(APIView):
    """
    GET  /api/lf-itse/expedientes/<pk>/archivos/
    POST /api/lf-itse/expedientes/<pk>/archivos/

    GET  — lista todos los archivos asociados al expediente.
    POST — sube un archivo digital y lo asocia al expediente.
           El request debe enviarse como ``multipart/form-data`` con el campo:
               archivo : file

    Parámetros de URL
    -----------------
    pk : int  — id del expediente.

    Retorna (GET)
    -------------
    200 OK  — lista de metadatos de archivos (ExpedienteArchivo[]).
    404     — expediente no encontrado.

    Retorna (POST)
    --------------
    201 Created  — metadatos del archivo guardado (ExpedienteArchivo).
    400          — no se envió ningún archivo o datos inválidos.
    404          — expediente no encontrado.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def get(self, request, pk):
        expediente = get_object_or_404(Expediente, pk=pk)
        archivos = ExpedienteArchivo.objects.filter(expediente=expediente).order_by('fecha_digitacion')
        return Response(
            ExpedienteArchivoSerializer(archivos, many=True).data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, pk):
        serializer = ExpedienteArchivoUploadSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            archivo_obj = subir_archivo_expediente(
                pk,
                serializer.validated_data['archivo'],
                request.user,
            )
            return Response(
                ExpedienteArchivoSerializer(archivo_obj).data,
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            logger.exception('Error al subir archivo al expediente pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExpedienteArchivoDetailView(APIView):
    """
    DELETE /api/lf-itse/expedientes/archivos/<pk>/

    Elimina el registro de metadatos en BD y el archivo físico del disco.

    Parámetros de URL
    -----------------
    pk : int  — id del registro ExpedienteArchivo a eliminar.

    Retorna
    -------
    204 No Content — eliminación exitosa.
    404            — registro no encontrado.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            eliminar_archivo_expediente(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.exception('Error al eliminar archivo pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ExpedienteArchivoDownloadView(APIView):
    """
    GET /api/lf-itse/expedientes/archivos/<uuid>/descargar/

    Retorna el archivo físico asociado al registro ``ExpedienteArchivo``
    identificado por su UUID.

    El header ``Content-Disposition`` se establece como ``inline`` para que
    el navegador pueda visualizarlo directamente (PDFs, imágenes, etc.).
    El nombre original del archivo se incluye para que al guardarlo conserve
    el nombre correcto.

    Parámetros de URL
    -----------------
    uuid : UUID  — uuid del registro ExpedienteArchivo.

    Retorna
    -------
    200 OK  — stream del archivo con el Content-Type apropiado.
    404     — registro no encontrado o archivo físico inexistente en disco.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, uuid):
        archivo_obj = get_object_or_404(ExpedienteArchivo, uuid=uuid)

        if not default_storage.exists(archivo_obj.ruta_archivo):
            return Response(
                {'error': 'El archivo físico no se encontró en el servidor.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        archivo_abierto = default_storage.open(archivo_obj.ruta_archivo, 'rb')

        content_type, _ = mimetypes.guess_type(archivo_obj.nombre_original)
        content_type = content_type or 'application/octet-stream'

        response = FileResponse(
            archivo_abierto,
            content_type=content_type,
        )
        response['Content-Disposition'] = (
            f'inline; filename="{archivo_obj.nombre_original}"'
        )
        return response


class DenegarLicenciaView(APIView):
    """
    POST /api/lf-itse/expedientes/<pk>/denegar-licencia/

    Registra la denegación de emisión de una licencia de funcionamiento
    para el expediente indicado.

    Parámetros de URL
    -----------------
    pk : int  — id del expediente.

    Body (JSON)
    -----------
    {
        "fecha_rechazo" : "YYYY-MM-DD",
        "documento"     : "<número o referencia del documento>",
        "observaciones" : "<texto>"
    }

    Retorna
    -------
    201 Created  — el registro de autorización improcedente creado.
    400          — datos inválidos o licencia ya emitida.
    404          — expediente no encontrado.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = DenegarLicenciaSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            autorizacion = denegar_licencia_funcionamiento(pk, serializer.validated_data, request.user)
            return Response(
                AutorizacionImprocedenteSerializer(autorizacion).data,
                status=status.HTTP_201_CREATED,
            )

        except LicenciaYaEmitidaError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.exception('Error al denegar licencia del expediente pk=%s', pk)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class DenegarItseView(APIView):
    """
    POST /api/lf-itse/expedientes/<pk>/denegar-itse/

    Registra la ITSE desfavorable para el expediente indicado.

    Parámetros de URL
    -----------------
    pk : int  — id del expediente.

    Body (JSON)
    -----------
    {
        "fecha_rechazo" : "YYYY-MM-DD",
        "documento"     : "<número o referencia del documento>",
        "observaciones" : "<texto>"
    }

    Retorna
    -------
    201 Created  — el registro de autorización improcedente creado.
    400          — datos inválidos o ITSE ya emitida.
    404          — expediente no encontrado.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        serializer = DenegarLicenciaSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            autorizacion = denegar_itse(pk, serializer.validated_data, request.user)
            return Response(
                AutorizacionImprocedenteSerializer(autorizacion).data,
                status=status.HTTP_201_CREATED,
            )

        except ItseYaEmitidaError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.exception('Error al registrar ITSE desfavorable del expediente pk=%s', pk)
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


# ── Licencias de Funcionamiento ────────────────────────────────────────────────

class LicenciaFuncionamientoCreateView(APIView):
    """
    POST /api/lf-itse/licencias-funcionamiento/

    Crea una nueva licencia de funcionamiento con sus giros asociados.
    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer_in = LicenciaFuncionamientoCreateSerializer(data=request.data)
            serializer_in.is_valid(raise_exception=True)

            licencia = crear_licencia(
                data=serializer_in.validated_data,
                usuario=request.user,
            )

            return Response({'id': licencia.id}, status=status.HTTP_201_CREATED)

        except LicenciaDenegadaError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except LicenciaDuplicadaError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except ReciboPagoDuplicadoError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception as e:
            logger.exception('Error al crear licencia de funcionamiento')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LicenciaFuncionamientoVerificarExpedienteView(APIView):
    """
    GET /api/lf-itse/licencias-funcionamiento/verificar-expediente/
        ?numero_expediente=<N>&anio=<YYYY>

    Verifica si un expediente puede tener una licencia de funcionamiento emitida.

    Parámetros de query string
    --------------------------
    numero_expediente : int  (obligatorio)
    anio              : int  (obligatorio) — año de recepción del expediente

    Respuesta
    ---------
    {
        "se_puede_emitir_licencia": true | false,
        "expediente_id": <int> | null,
        "mensaje": ""
    }

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        numero_str = request.query_params.get('numero_expediente', '').strip()
        anio_str   = request.query_params.get('anio', '').strip()

        if not numero_str:
            return Response(
                {'error': "El parámetro 'numero_expediente' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not anio_str:
            return Response(
                {'error': "El parámetro 'anio' es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            numero_expediente = int(numero_str)
            anio = int(anio_str)
        except ValueError:
            return Response(
                {'error': "Los parámetros 'numero_expediente' y 'anio' deben ser números enteros."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = verificar_numero_expediente_para_licencia(numero_expediente, anio)
            return Response(resultado, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception(
                'Error al verificar expediente para licencia (numero=%s, anio=%s)',
                numero_expediente, anio,
            )
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LicenciasFuncionamientoBuscarView(APIView):
    """
    GET /api/lf-itse/licencias-funcionamiento/buscar/?filtro=<FILTRO>&valor=<VALOR>

    Busca licencias de funcionamiento según el filtro y valor indicados.

    Parámetros de query string
    --------------------------
    filtro : str  (obligatorio)
        NUMERO | EXPEDIENTE | NOMBRE_COMERCIAL | FECHA_EMISION |
        NOMBRES_TITULAR | RUC_TITULAR | NOMBRES_CONDUCTOR |
        DIRECCION | RECIBO_PAGO | RESOLUCION_NUMERO
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

            resultados = buscar_licencias(filtro, valor)
            return Response(resultados, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.exception('Error al buscar licencias de funcionamiento (filtro=%s)', filtro)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class NivelRiesgoListView(APIView):
    """
    GET /api/lf-itse/niveles-riesgo/

    Retorna los niveles de riesgo ordenados por id.

    Parámetros de query string
    --------------------------
    esta_activo : str  (opcional)
        'true'  → solo activos.
        'false' → solo inactivos.
        Si se omite se devuelven todos.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            param = request.query_params.get('esta_activo', '').strip().lower()

            if param == 'true':
                esta_activo = True
            elif param == 'false':
                esta_activo = False
            elif param == '':
                esta_activo = None
            else:
                return Response(
                    {'error': "El parámetro 'esta_activo' debe ser 'true' o 'false'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            niveles = listar_niveles_riesgo(esta_activo)
            serializer = NivelRiesgoSerializer(niveles, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al listar niveles de riesgo')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class EstadosInactivosLfListView(APIView):
    """
    GET /api/lf-itse/estados/inactivos-lf/

    Lista los estados inactivos que pueden aplicarse a una licencia de
    funcionamiento (``esta_activo = FALSE`` y ``es_para_lf = TRUE``).

    Equivalente PostgreSQL de la consulta SQL Server original::

        SELECT id, nombre, es_para_lf, es_para_itse, esta_activo
        FROM estados
        WHERE esta_activo = FALSE AND es_para_lf = TRUE

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            estados = listar_estados_inactivos_para_lf()
            return Response(estados, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error al listar estados inactivos para LF')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class TipoLicenciaListView(APIView):
    """
    GET /api/lf-itse/tipos-licencia/

    Retorna los tipos de licencia ordenados por id.

    Parámetros de query string
    --------------------------
    esta_activo : str  (opcional)
        'true'  → solo activos.
        'false' → solo inactivos.
        Si se omite se devuelven todos.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            param = request.query_params.get('esta_activo', '').strip().lower()

            if param == 'true':
                esta_activo = True
            elif param == 'false':
                esta_activo = False
            elif param == '':
                esta_activo = None
            else:
                return Response(
                    {'error': "El parámetro 'esta_activo' debe ser 'true' o 'false'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            tipos = listar_tipos_licencia(esta_activo)
            serializer = TipoLicenciaSerializer(tipos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al listar tipos de licencia')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ZonificacionListView(APIView):
    """
    GET /api/lf-itse/zonificaciones/

    Retorna las zonificaciones ordenadas por id.

    Parámetros de query string
    --------------------------
    esta_activo : str  (opcional)
        'true'  → solo activas.
        'false' → solo inactivas.
        Si se omite se devuelven todas.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            param = request.query_params.get('esta_activo', '').strip().lower()

            if param == 'true':
                esta_activo = True
            elif param == 'false':
                esta_activo = False
            elif param == '':
                esta_activo = None
            else:
                return Response(
                    {'error': "El parámetro 'esta_activo' debe ser 'true' o 'false'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            zonificaciones = listar_zonificaciones(esta_activo)
            serializer = ZonificacionSerializer(zonificaciones, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al listar zonificaciones')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GirosBuscarView(APIView):
    """
    GET /api/lf-itse/giros/buscar/

    Busca giros por nombre o código CIIU, con filtro opcional por estado.

    Parámetros de query string
    --------------------------
    busqueda   : str   (opcional)
        Texto libre que se busca en ``nombre`` (parcial) y en ``ciiu_id``
        (exacto, solo cuando el valor es numérico).
        Si se omite se devuelven todos los registros.
    esta_activo : str  (opcional)
        'true'  → solo activos.
        'false' → solo inactivos.
        Si se omite se devuelven todos.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            busqueda = request.query_params.get('busqueda', '').strip() or None

            param = request.query_params.get('esta_activo', '').strip().lower()
            if param == 'true':
                esta_activo = True
            elif param == 'false':
                esta_activo = False
            elif param == '':
                esta_activo = None
            else:
                return Response(
                    {'error': "El parámetro 'esta_activo' debe ser 'true' o 'false'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            giros = buscar_giros(busqueda=busqueda, esta_activo=esta_activo)
            serializer = GiroSerializer(giros, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception('Error al buscar giros')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LicenciaFuncionamientoGirosListView(APIView):
    """
    GET /api/lf-itse/licencias-funcionamiento/<id>/giros/

    Lista los giros asociados a una licencia de funcionamiento.

    Parámetros de ruta
    ------------------
    pk : int
        PK de la licencia de funcionamiento.

    Retorna
    -------
    200  Lista de giros con: id, licencia_funcionamiento_id, giro_id,
         ciiu_id, nombre.
    404  Si la licencia no existe.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        from .models import LicenciaFuncionamiento
        try:
            if not LicenciaFuncionamiento.objects.filter(pk=pk).exists():
                return Response(
                    {'error': 'La licencia de funcionamiento no existe.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            giros = listar_giros_por_licencia(pk)
            return Response(giros, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Error al listar giros de la licencia')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LicenciaFuncionamientoUpdateView(APIView):
    """
    PUT /api/lf-itse/licencias-funcionamiento/<pk>/

    Modifica una licencia de funcionamiento existente.

    Parámetros de ruta
    ------------------
    pk : int
        PK de la licencia a modificar.

    Body (JSON)
    -----------
    Todos los campos de la licencia (ver ``LicenciaFuncionamientoUpdateSerializer``).
    Los giros se reemplazan completamente con la lista enviada.

    Respuestas
    ----------
    200  Licencia modificada correctamente.
    400  Datos de entrada inválidos.
    404  La licencia no existe.
    409  Número de licencia duplicado, recibo de pago duplicado o
         expediente con licencia denegada.
    500  Error interno.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        from .models import LicenciaFuncionamiento
        serializer = LicenciaFuncionamientoUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            licencia = modificar_licencia(pk, serializer.validated_data)
            return Response(
                {'id': licencia.id, 'mensaje': 'Licencia modificada correctamente.'},
                status=status.HTTP_200_OK,
            )

        except LicenciaFuncionamiento.DoesNotExist:
            return Response(
                {'error': 'La licencia de funcionamiento no existe.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except (LicenciaDenegadaError, LicenciaDuplicadaError, ReciboPagoDuplicadoError) as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            logger.exception('Error al modificar la licencia de funcionamiento')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LicenciaFuncionamientoNotificacionView(APIView):
    """
    PATCH /api/lf-itse/licencias-funcionamiento/<pk>/notificacion/

    Registra la fecha de notificación de entrega de una licencia de
    funcionamiento actualizando la columna ``fecha_notificacion``.

    Parámetros de ruta
    ------------------
    pk : int
        PK de la licencia.

    Body (JSON)
    -----------
    fecha_notificacion : str  (formato YYYY-MM-DD)

    Respuestas
    ----------
    200  Fecha de notificación registrada correctamente.
    400  Datos de entrada inválidos.
    404  La licencia no existe.
    409  La fecha de notificación es anterior a la fecha de emisión.
    500  Error interno.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        from .models import LicenciaFuncionamiento
        serializer = LicenciaFuncionamientoNotificacionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            registrar_notificacion(
                pk,
                serializer.validated_data['fecha_notificacion'],
            )
            return Response(
                {'mensaje': 'Fecha de notificación registrada correctamente.'},
                status=status.HTTP_200_OK,
            )
        except LicenciaFuncionamiento.DoesNotExist:
            return Response(
                {'error': 'La licencia de funcionamiento no existe.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except NotificacionFechaInvalidaError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            logger.exception('Error al registrar la notificación de la licencia')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LicenciaFuncionamientoInactivarView(APIView):
    """
    POST /api/lf-itse/licencias-funcionamiento/inactivar/

    Registra la inactivación de una licencia de funcionamiento insertando una
    fila en ``licencias_funcionamiento_estados``.

    Body (JSON)
    -----------
    licencia_funcionamiento_id : int
    estado_id                  : int
    fecha_estado               : str  (YYYY-MM-DD)
    documento                  : str  (máx. 100 caracteres)
    observaciones              : str  (máx. 1000 caracteres)

    ``usuario_id`` y ``fecha_digitacion`` se asignan automáticamente desde el
    JWT y la fecha/hora del servidor.

    Respuestas
    ----------
    201  Registro creado correctamente.
    400  Datos de entrada inválidos.
    404  La licencia de funcionamiento no existe.
    409  Ya existe un registro con el mismo par licencia + estado.
    500  Error interno.

    Requiere autenticación JWT.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import LicenciaFuncionamiento
        serializer = LicenciaFuncionamientoInactivarSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            registro = registrar_inactivacion_licencia(
                licencia_funcionamiento_id=data['licencia_funcionamiento_id'],
                estado_id=data['estado_id'],
                fecha_estado=data['fecha_estado'],
                documento=data['documento'].strip(),
                observaciones=data['observaciones'].strip(),
                usuario=request.user,
            )
            return Response(
                {
                    'id': registro.id,
                    'mensaje': 'Inactivación de la licencia registrada correctamente.',
                },
                status=status.HTTP_201_CREATED,
            )
        except LicenciaFuncionamiento.DoesNotExist:
            return Response(
                {'error': 'La licencia de funcionamiento no existe.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except EstadoInactivacionDuplicadoError as exc:
            return Response(
                {'error': str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            logger.exception('Error al registrar la inactivación de la licencia')
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
