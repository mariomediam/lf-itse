"""
Servicios de negocio para ItseArchivo.

Misma estrategia que ``licencia_funcionamiento_archivo``: almacenamiento bajo
MEDIA_ROOT, transacciones y limpieza de disco ante fallos.
"""

import logging
import uuid
from pathlib import Path

from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import Itse, ItseArchivo

logger = logging.getLogger(__name__)


def subir_archivo_itse(pk: int, archivo, usuario) -> ItseArchivo:
    """
    Guarda el archivo en disco y registra el metadato en ``itse_archivos``.

    Estructura de almacenamiento
    ----------------------------
    MEDIA_ROOT/
      itse/
        <itse_id>/
          <uuid>.<extension>
    """
    itse = get_object_or_404(Itse, pk=pk)

    nombre_original = archivo.name
    extension       = Path(nombre_original).suffix.lstrip('.').lower()
    nombre_archivo  = f'{uuid.uuid4()}.{extension}' if extension else str(uuid.uuid4())
    ruta_relativa   = f'itse/{pk}/{nombre_archivo}'

    ruta_guardada = default_storage.save(ruta_relativa, archivo)

    try:
        with transaction.atomic():
            return ItseArchivo.objects.create(
                itse=itse,
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


def eliminar_archivo_itse(pk: int) -> None:
    """
    Elimina el registro de la BD y el archivo físico del disco.
    """
    archivo_obj = get_object_or_404(ItseArchivo, pk=pk)
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
