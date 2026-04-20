import { useState, useEffect, useRef, useCallback } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { itseApi } from '@api/itseApi'

const MAX_SIZE_BYTES = 15 * 1024 * 1024

const formatSize = (bytes) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const formatNumeroItse = (numero, fechaExpedicion) => {
  const anio = new Date(fechaExpedicion).getFullYear()
  return `ITSE ${String(numero).padStart(4, '0')}-${anio}`
}

const IconoArchivo = () => (
  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const IconoEliminar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const IconoSubir = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
)

const IconoUploadGrande = () => (
  <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 10V4m0 0l-3 3m3-3l3 3" />
  </svg>
)

/**
 * Modal para gestionar archivos adjuntos de un certificado ITSE.
 *
 * Props
 * -----
 * isOpen  : bool
 * onClose : () => void
 * itse    : object — id, numero_itse, fecha_expedicion
 */
export default function DocumentosAdjuntosItseModal({ isOpen, onClose, itse }) {
  const [archivos,            setArchivos]            = useState([])
  const [cargando,            setCargando]            = useState(false)
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null)
  const [subiendo,            setSubiendo]            = useState(false)
  const [confirmandoId,       setConfirmandoId]       = useState(null)
  const [eliminandoId,        setEliminandoId]        = useState(null)
  const [descargandoUuid,     setDescargandoUuid]     = useState(null)
  const [dragging,            setDragging]            = useState(false)

  const inputRef = useRef(null)
  const dropRef  = useRef(null)

  const cargarArchivos = useCallback(async () => {
    if (!itse) return
    setCargando(true)
    try {
      const res = await itseApi.listarArchivos(itse.id)
      setArchivos(res.data)
    } catch {
      toast.error('Error al cargar los archivos del ITSE')
    } finally {
      setCargando(false)
    }
  }, [itse])

  useEffect(() => {
    if (isOpen) {
      cargarArchivos()
      setArchivoSeleccionado(null)
      setConfirmandoId(null)
    }
  }, [isOpen, cargarArchivos])

  const validarYSeleccionar = (file) => {
    if (!file) return
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('El archivo supera el tamaño máximo permitido de 15 MB')
      return
    }
    setArchivoSeleccionado(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (e) => {
    if (!dropRef.current?.contains(e.relatedTarget)) {
      setDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    validarYSeleccionar(e.dataTransfer.files[0])
  }

  const handleInputChange = (e) => {
    validarYSeleccionar(e.target.files[0])
  }

  const handleSubir = async () => {
    if (!archivoSeleccionado) {
      toast.error('Seleccione o arrastre un archivo primero')
      return
    }
    const formData = new FormData()
    formData.append('archivo', archivoSeleccionado)

    setSubiendo(true)
    try {
      await itseApi.subirArchivo(itse.id, formData)
      toast.success('Archivo subido correctamente')
      setArchivoSeleccionado(null)
      if (inputRef.current) inputRef.current.value = ''
      await cargarArchivos()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al subir el archivo'
      toast.error(msg)
    } finally {
      setSubiendo(false)
    }
  }

  const handleConfirmarEliminar = async (archivo) => {
    setEliminandoId(archivo.id)
    try {
      await itseApi.eliminarArchivo(archivo.id)
      toast.success('Archivo eliminado')
      setArchivos((prev) => prev.filter((a) => a.id !== archivo.id))
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al eliminar el archivo'
      toast.error(msg)
    } finally {
      setEliminandoId(null)
      setConfirmandoId(null)
    }
  }

  const handleDescargar = async (archivo) => {
    setDescargandoUuid(archivo.uuid)
    try {
      const res = await itseApi.descargarArchivo(archivo.uuid)
      const contentType = res.headers['content-type'] || 'application/octet-stream'
      const blob = new Blob([res.data], { type: contentType })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = archivo.nombre_original
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el archivo')
    } finally {
      setDescargandoUuid(null)
    }
  }

  return (
    <Modal show={isOpen} size="2xl" onClose={onClose}>

      <ModalHeader className="border-b border-gray-200 flex-col items-start gap-1">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">Documentos adjuntos</span>
        </div>
        {itse && (
          <p className="text-xs text-gray-500 font-normal pl-7">
            {formatNumeroItse(itse.numero_itse, itse.fecha_expedicion)}
          </p>
        )}
      </ModalHeader>

      <ModalBody className="bg-white px-6 py-5 space-y-4">

        {/* Zona de arrastre */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={[
            'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center',
            'cursor-pointer transition-colors select-none',
            dragging
              ? 'border-primary bg-primary/5'
              : archivoSeleccionado
                ? 'border-success bg-success/5'
                : 'border-gray-300 hover:border-primary hover:bg-gray-50',
          ].join(' ')}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleInputChange}
            accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
          />

          {archivoSeleccionado ? (
            <>
              <svg className="w-10 h-10 text-success mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-semibold text-success">{archivoSeleccionado.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{formatSize(archivoSeleccionado.size)}</p>
              <p className="text-xs text-gray-400 mt-1">Haga clic para cambiar el archivo</p>
            </>
          ) : (
            <>
              <IconoUploadGrande />
              <p className="mt-3 text-sm font-semibold text-primary">Arrastre archivo aquí</p>
              <p className="text-xs text-gray-500">o haga clic para explorar (PDF)</p>
              <p className="text-xs text-gray-400 mt-1">Tamaño máximo 15 MB</p>
            </>
          )}
        </div>

        {/* Botón subir */}
        <button
          type="button"
          onClick={handleSubir}
          disabled={subiendo || !archivoSeleccionado}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <IconoSubir />
          {subiendo ? 'Subiendo...' : 'Subir archivo'}
        </button>

        {/* Lista de archivos */}
        {cargando ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : archivos.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">
            No hay archivos adjuntos en este certificado ITSE.
          </p>
        ) : (
          <div className="space-y-2">
            {archivos.map((archivo) => (
              <div
                key={archivo.id}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <IconoArchivo />
                <button
                  type="button"
                  onClick={() => handleDescargar(archivo)}
                  disabled={descargandoUuid === archivo.uuid}
                  className="flex-1 min-w-0 text-left group"
                  title="Haga clic para descargar"
                >
                  <p className={[
                    'text-sm font-medium truncate transition-colors',
                    descargandoUuid === archivo.uuid
                      ? 'text-gray-400'
                      : 'text-primary group-hover:underline',
                  ].join(' ')}>
                    {descargandoUuid === archivo.uuid ? 'Descargando...' : archivo.nombre_original}
                  </p>
                  <p className="text-xs text-gray-400">{formatSize(archivo.tamanio_bytes)}</p>
                </button>

                {confirmandoId === archivo.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-600">¿Eliminar?</span>
                    <button
                      type="button"
                      onClick={() => handleConfirmarEliminar(archivo)}
                      disabled={eliminandoId === archivo.id}
                      className="px-2.5 py-1 bg-danger text-white rounded text-xs font-medium
                        hover:bg-danger/90 disabled:opacity-50 transition-colors"
                    >
                      {eliminandoId === archivo.id ? '...' : 'Sí'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(null)}
                      className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs
                        font-medium hover:bg-gray-100 transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmandoId(archivo.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-danger text-danger
                      rounded-lg text-xs font-medium hover:bg-danger/10 transition-colors shrink-0"
                  >
                    <IconoEliminar />
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      </ModalBody>

      <ModalFooter className="border-t border-gray-200 bg-white flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600
            rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Salir
        </button>
      </ModalFooter>

    </Modal>
  )
}
