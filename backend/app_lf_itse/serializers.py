from rest_framework import serializers

from . import models


class UnidadOrganicaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.UnidadOrganica
        fields = '__all__'


class TipoProcedimientoTupaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TipoProcedimientoTupa
        fields = '__all__'


class TipoProcedimientoTupaWriteSerializer(serializers.ModelSerializer):
    """
    Serializador de entrada para crear y actualizar TipoProcedimientoTupa.

    Excluye ``usuario`` y ``fecha_digitacion`` porque son asignados
    automáticamente en la capa de servicio.
    """

    class Meta:
        model = models.TipoProcedimientoTupa
        exclude = ('usuario', 'fecha_digitacion')


class TipoDocumentoIdentidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TipoDocumentoIdentidad
        fields = '__all__'


class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Estado
        fields = '__all__'


class NivelRiesgoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.NivelRiesgo
        fields = '__all__'


class TipoLicenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TipoLicencia
        fields = '__all__'


class ZonificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Zonificacion
        fields = '__all__'


class GiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Giro
        fields = '__all__'


class PersonaDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.PersonaDocumento
        fields = '__all__'


class PersonaSerializer(serializers.ModelSerializer):
    documentos = PersonaDocumentoSerializer(many=True, read_only=True)

    class Meta:
        model = models.Persona
        fields = '__all__'


class PersonaDocumentoNestedSerializer(serializers.ModelSerializer):
    """Documento sin anidar persona (útil al crear persona y documentos en un paso)."""

    class Meta:
        model = models.PersonaDocumento
        exclude = ('persona',)


class ExpedienteArchivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ExpedienteArchivo
        fields = '__all__'
        extra_kwargs = {'uuid': {'read_only': True}}


class AutorizacionImprocedenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.AutorizacionImprocedente
        fields = '__all__'


class ExpedienteSerializer(serializers.ModelSerializer):
    archivos = ExpedienteArchivoSerializer(many=True, read_only=True)
    autorizaciones_improcedentes = AutorizacionImprocedenteSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = models.Expediente
        fields = '__all__'
        extra_kwargs = {'uuid': {'read_only': True}}


class LicenciaFuncionamientoArchivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LicenciaFuncionamientoArchivo
        fields = '__all__'
        extra_kwargs = {'uuid': {'read_only': True}}


class LicenciaFuncionamientoEstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LicenciaFuncionamientoEstado
        fields = '__all__'


class LicenciaFuncionamientoGiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LicenciaFuncionamientoGiro
        fields = '__all__'


class LicenciaFuncionamientoSerializer(serializers.ModelSerializer):
    archivos = LicenciaFuncionamientoArchivoSerializer(many=True, read_only=True)
    historial_estados = LicenciaFuncionamientoEstadoSerializer(many=True, read_only=True)
    giros = LicenciaFuncionamientoGiroSerializer(many=True, read_only=True)

    class Meta:
        model = models.LicenciaFuncionamiento
        fields = '__all__'
        extra_kwargs = {'uuid': {'read_only': True}}


class ItseArchivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ItseArchivo
        fields = '__all__'
        extra_kwargs = {'uuid': {'read_only': True}}


class ItseEstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ItseEstado
        fields = '__all__'


class ItseGiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.ItseGiro
        fields = '__all__'


class ItseSerializer(serializers.ModelSerializer):
    archivos = ItseArchivoSerializer(many=True, read_only=True)
    historial_estados = ItseEstadoSerializer(many=True, read_only=True)
    giros = ItseGiroSerializer(many=True, read_only=True)

    class Meta:
        model = models.Itse
        fields = '__all__'
        extra_kwargs = {'uuid': {'read_only': True}}


# ---------------------------------------------------------------------------
# Persona — entrada (POST / PUT /personas/)
# ---------------------------------------------------------------------------

class PersonaDocumentoWriteSerializer(serializers.Serializer):
    """Un documento de identidad dentro del payload de crear/actualizar persona."""
    tipo_documento_identidad_id = serializers.IntegerField()
    numero_documento            = serializers.CharField(max_length=20)


class PersonaWriteSerializer(serializers.Serializer):
    """
    Valida los datos de entrada para crear o actualizar una Persona.

    Para tipo_persona = 'J' (jurídica):
      - nombres      → razón social  (obligatorio)
      - apellido_paterno / apellido_materno → se ignoran y quedan vacíos
    Para tipo_persona = 'N' (natural):
      - apellido_paterno es obligatorio
    """
    tipo_persona       = serializers.ChoiceField(choices=['N', 'J'])
    sexo               = serializers.ChoiceField(
                             choices=['M', 'F', 'X'],
                             required=False,
                             default='X',
                         )
    apellido_paterno   = serializers.CharField(max_length=50,  required=False, allow_blank=True, allow_null=True)
    apellido_materno   = serializers.CharField(max_length=50,  required=False, allow_blank=True, allow_null=True)
    nombres            = serializers.CharField(max_length=100)
    direccion          = serializers.CharField(max_length=250)
    distrito           = serializers.CharField(max_length=100)
    provincia          = serializers.CharField(max_length=100)
    departamento       = serializers.CharField(max_length=100)
    telefono           = serializers.CharField(max_length=30,  required=False, allow_blank=True, allow_null=True)
    correo_electronico = serializers.CharField(max_length=150, required=False, allow_blank=True, allow_null=True)
    documentos         = PersonaDocumentoWriteSerializer(many=True)

    def validate(self, data):
        if data.get('tipo_persona') == 'N' and not data.get('apellido_paterno'):
            raise serializers.ValidationError(
                {'apellido_paterno': 'Este campo es obligatorio para persona natural.'}
            )
        if not data.get('documentos'):
            raise serializers.ValidationError(
                {'documentos': 'Debe incluir al menos un documento de identidad.'}
            )
        return data


# ---------------------------------------------------------------------------
# Expediente — entrada (POST /expedientes/)
# ---------------------------------------------------------------------------

class ExpedienteCreateSerializer(serializers.Serializer):
    """
    Valida los datos de entrada para crear un expediente.

    numero_expediente  → opcional; si se omite o es nulo el sistema lo calcula.
    fecha_recepcion    → obligatorio; se usa para calcular plazos y correlativo.
    tipo_procedimiento_tupa_id → obligatorio; determina plazo y días de alerta.
    solicitante_id     → obligatorio.
    representante_id   → opcional.
    observaciones      → opcional.
    """

    numero_expediente = serializers.IntegerField(
        required=False,
        allow_null=True,
        min_value=1,
    )
    fecha_recepcion = serializers.DateTimeField()
    tipo_procedimiento_tupa_id = serializers.IntegerField()
    solicitante_id = serializers.IntegerField()
    representante_id = serializers.IntegerField(required=False, allow_null=True)
    observaciones = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=250,
    )


# ---------------------------------------------------------------------------
# Variantes ligeras (listados / exposición por UUID sin relaciones anidadas)
# ---------------------------------------------------------------------------


class ExpedienteListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Expediente
        fields = (
            'id',
            'uuid',
            'numero_expediente',
            'fecha_recepcion',
            'fecha_vencimiento',
            'fecha_alerta',
            'tipo_procedimiento_tupa',
            'solicitante',
        )
        extra_kwargs = {'uuid': {'read_only': True}}


class LicenciaFuncionamientoListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.LicenciaFuncionamiento
        fields = (
            'id',
            'uuid',
            'numero_licencia',
            'fecha_emision',
            'nombre_comercial',
            'titular',
            'expediente',
        )
        extra_kwargs = {'uuid': {'read_only': True}}


class ItseListSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Itse
        fields = (
            'id',
            'uuid',
            'numero_itse',
            'fecha_expedicion',
            'fecha_caducidad',
            'nombre_comercial',
            'titular',
            'expediente',
        )
        extra_kwargs = {'uuid': {'read_only': True}}
