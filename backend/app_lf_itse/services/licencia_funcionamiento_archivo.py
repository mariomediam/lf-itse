"""
Servicios de negocio para LicenciaFuncionamientoArchivo.

Misma estrategia que ``expediente_archivo``: almacenamiento bajo MEDIA_ROOT,
transacciones y limpieza de disco ante fallos.
"""

import logging
import uuid
from pathlib import Path

from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import LicenciaFuncionamiento, LicenciaFuncionamientoArchivo

logger = logging.getLogger(__name__)


def subir_archivo_licencia_funcionamiento(pk: int, archivo, usuario) -> LicenciaFuncionamientoArchivo:
    """
    Guarda el archivo en disco y registra el metadato en ``licencias_funcionamiento_archivos``.

    Estructura de almacenamiento
    ----------------------------
    MEDIA_ROOT/
      licencias_funcionamiento/
        <licencia_funcionamiento_id>/
          <uuid>.<extension>
    """
    licencia = get_object_or_404(LicenciaFuncionamiento, pk=pk)

    nombre_original = archivo.name
    extension       = Path(nombre_original).suffix.lstrip('.').lower()
    nombre_archivo  = f'{uuid.uuid4()}.{extension}' if extension else str(uuid.uuid4())
    ruta_relativa   = f'licencias_funcionamiento/{pk}/{nombre_archivo}'

    ruta_guardada = default_storage.save(ruta_relativa, archivo)

    try:
        with transaction.atomic():
            return LicenciaFuncionamientoArchivo.objects.create(
                licencia_funcionamiento=licencia,
                nombre_original=nombre_original,
                nombre_archivo=nombre_archivo,
                ruta_archivo=ruta_guardada,
                extension=extension,
                tamanio_bytes=archivo.size,
                usuario=usuario,
                fecha_digitacion=timezone.now(),
            )
    except Exception:
        default_storage.delete(ruta_guardada)
        raise


def eliminar_archivo_licencia_funcionamiento(pk: int) -> None:
    """
    Elimina el registro de la BD y el archivo físico del disco.
    """
    archivo_obj = get_object_or_404(LicenciaFuncionamientoArchivo, pk=pk)
    ruta = archivo_obj.ruta_archivo

    with transaction.atomic():
        archivo_obj.delete()

    if default_storage.exists(ruta):
        try:
            default_storage.delete(ruta)
        except Exception:
            logger.warning(
                'No se pudo eliminar el archivo físico "%s" (pk=%s). '
                'El registro de BD ya fue eliminado.',
                ruta, pk,
            )
