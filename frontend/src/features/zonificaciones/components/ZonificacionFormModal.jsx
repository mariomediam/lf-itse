import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { zonificacionesApi } from '@api/zonificacionesApi'

// ── Estilos comunes ───────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

// ── Estado inicial ────────────────────────────────────────────────────────────

const estadoInicial = {
  codigo:      '',
  nombre:      '',
  esta_activo: true,
}

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoGuardar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
)

const IconoCancelar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// ── Componente principal ──────────────────────────────────────────────────────

/**
 * Modal para agregar o modificar una zonificación.
 *
 * Props
 * -----
 * isOpen        : bool
 * onClose       : () => void
 * onSuccess     : () => void
 * zonificacion  : object | null  — si se pasa, modo edición
 */
export default function ZonificacionFormModal({ isOpen, onClose, onSuccess, zonificacion = null }) {
  const esEdicion = !!zonificacion

  const [formData,     setFormData]     = useState(estadoInicial)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Poblar formulario al abrir en modo edición
  useEffect(() => {
    if (!isOpen) return
    if (zonificacion) {
      setFormData({
        codigo:      zonificacion.codigo      ?? '',
        nombre:      zonificacion.nombre      ?? '',
        esta_activo: zonificacion.esta_activo ?? true,
      })
    } else {
      setFormData(estadoInicial)
    }
  }, [isOpen, zonificacion])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleClose = () => {
    setFormData(estadoInicial)
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.codigo.trim()) {
      toast.error('El código de la zonificación es obligatorio')
      return
    }
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la zonificación es obligatorio')
      return
    }

    const body = {
      codigo:      formData.codigo.trim(),
      nombre:      formData.nombre.trim(),
      esta_activo: formData.esta_activo,
    }

    setIsSubmitting(true)
    try {
      if (esEdicion) {
        await zonificacionesApi.actualizar(zonificacion.id, body)
      } else {
        await zonificacionesApi.crear(body)
      }
      toast.success(esEdicion ? 'Zonificación actualizada correctamente' : 'Zonificación creada correctamente')
      onSuccess?.()
      handleClose()
    } catch (err) {
      const data = err.response?.data
      const detail =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        (typeof data === 'string' ? data : null) ||
        'Error al guardar la zonificación'
      toast.error(detail)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>

      {/* ── Cabecera ── */}
      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            {esEdicion ? 'Modificar zonificación' : 'Agregar zonificación'}
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-5 space-y-5">

        {/* Código */}
        <div>
          <label className={labelClass}>
            Código <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="codigo"
            value={formData.codigo}
            onChange={handleChange}
            placeholder="Ej: R1, I2, ZRE..."
            className={inputClass}
            maxLength={30}
          />
        </div>

        {/* Nombre */}
        <div>
          <label className={labelClass}>
            Nombre <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            placeholder="Descripción de la zonificación"
            className={inputClass}
            maxLength={150}
          />
        </div>

        {/* Estado activo */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="esta_activo"
            name="esta_activo"
            checked={formData.esta_activo}
            onChange={handleChange}
            className="w-4 h-4 text-primary border-gray-300 rounded
                       focus:ring-2 focus:ring-primary/30 cursor-pointer"
          />
          <label htmlFor="esta_activo" className="text-sm text-gray-700 cursor-pointer select-none">
            Zonificación activa
          </label>
        </div>

      </ModalBody>

      {/* ── Pie ── */}
      <ModalFooter className="border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600
            rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <IconoCancelar />
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <IconoGuardar />
          )}
          {isSubmitting ? 'Guardando...' : 'Guardar zonificación'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
