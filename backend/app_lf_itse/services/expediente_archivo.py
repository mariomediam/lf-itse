"""
Servicios de negocio para ExpedienteArchivo.

Centraliza la lógica del dominio separándola de la capa HTTP (views/serializers),
lo que facilita reutilización, pruebas unitarias y futuros cambios.
"""

import logging
import uuid
from pathlib import Path

from django.core.files.storage import default_storage
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from ..models import Expediente, ExpedienteArchivo

logger = logging.getLogger(__name__)


def subir_archivo_expediente(pk: int, archivo, usuario) -> ExpedienteArchivo:
    """
    Guarda el archivo en disco y registra el metadato en ``expedientes_archivos``.

    La operación es atómica respecto al par (archivo en disco ↔ registro en BD):
    - Si la escritura en disco falla, no se crea ningún registro en BD.
    - Si la inserción en BD falla, el archivo recién guardado se elimina del disco.

    Estructura de almacenamiento
    ----------------------------
    MEDIA_ROOT/
      expedientes/
        <expediente_id>/
          <uuid>.<extension>

    Parámetros
    ----------
    pk : int
        PK del expediente al que pertenece el archivo.
    archivo : InMemoryUploadedFile | TemporaryUploadedFile
        Objeto de archivo recibido desde ``request.FILES``.
    usuario : AUTH_USER_MODEL instance
        Usuario autenticado obtenido del JWT.

    Retorna
    -------
    ExpedienteArchivo
        Instancia recién creada con todos sus metadatos.

    Lanza
    -----
    Http404
        Si el expediente no existe.
    """
    expediente = get_object_or_404(Expediente, pk=pk)

    nombre_original = archivo.name
    extension       = Path(nombre_original).suffix.lstrip('.').lower()
    nombre_archivo  = f'{uuid.uuid4()}.{extension}' if extension else str(uuid.uuid4())
    ruta_relativa   = f'expedientes/{pk}/{nombre_archivo}'

    # 1. Guardar el archivo en disco (fuera de la transacción BD)
    ruta_guardada = default_storage.save(ruta_relativa, archivo)

    # 2. Crear el registro en BD; si falla, borrar el archivo recién guardado
    try:
        with transaction.atomic():
            return ExpedienteArchivo.objects.create(
                expediente=expediente,
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


def eliminar_archivo_expediente(pk: int) -> None:
    """
    Elimina el registro de la BD y el archivo físico del disco.

    Estrategia de atomicidad
    ------------------------
    1. Se elimina primero el registro de BD dentro de ``transaction.atomic()``.
       Si falla, no se toca el disco y la excepción se propaga.
    2. Solo si la BD tuvo éxito se elimina el archivo del disco.
       Si el borrado del disco falla se registra un warning (el archivo
       queda huérfano, pero no hay un registro en BD apuntando a la nada).

    Parámetros
    ----------
    pk : int
        PK del registro ``ExpedienteArchivo`` a eliminar.

    Lanza
    -----
    Http404
        Si el registro no existe.
    """
    archivo_obj = get_object_or_404(ExpedienteArchivo, pk=pk)
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
