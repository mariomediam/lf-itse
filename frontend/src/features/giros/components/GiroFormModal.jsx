import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { girosApi } from '@api/girosApi'

// ── Estilos comunes ───────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

// ── Estado inicial ────────────────────────────────────────────────────────────

const estadoInicial = {
  ciiu_id:     '',
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
 * Modal para agregar o modificar un giro.
 *
 * Props
 * -----
 * isOpen   : bool
 * onClose  : () => void
 * onSuccess: () => void
 * giro     : object | null  — si se pasa, modo edición
 */
export default function GiroFormModal({ isOpen, onClose, onSuccess, giro = null }) {
  const esEdicion = !!giro

  const [formData,     setFormData]     = useState(estadoInicial)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Poblar formulario al abrir en modo edición
  useEffect(() => {
    if (!isOpen) return
    if (giro) {
      setFormData({
        ciiu_id:     giro.ciiu_id ?? '',
        nombre:      giro.nombre ?? '',
        esta_activo: giro.esta_activo ?? true,
      })
    } else {
      setFormData(estadoInicial)
    }
  }, [isOpen, giro])

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
    if (!formData.nombre.trim()) {
      toast.error('El nombre del giro es obligatorio')
      return
    }

    const body = {
      nombre:      formData.nombre.trim(),
      esta_activo: formData.esta_activo,
    }

    if (formData.ciiu_id !== '' && formData.ciiu_id !== null) {
      const num = Number(formData.ciiu_id)
      if (!Number.isInteger(num) || num < 1) {
        toast.error('El código CIIU debe ser un número entero positivo')
        return
      }
      body.ciiu_id = num
    } else {
      body.ciiu_id = null
    }

    setIsSubmitting(true)
    try {
      if (esEdicion) {
        await girosApi.actualizar(giro.id, body)
      } else {
        await girosApi.crear(body)
      }
      toast.success(esEdicion ? 'Giro actualizado correctamente' : 'Giro creado correctamente')
      onSuccess?.()
      handleClose()
    } catch (err) {
      const data = err.response?.data
      const detail =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        (typeof data === 'string' ? data : null) ||
        'Error al guardar el giro'
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            {esEdicion ? 'Modificar giro' : 'Agregar giro'}
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-5 space-y-5">

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
            placeholder="Descripción del giro comercial"
            className={inputClass}
            maxLength={200}
          />
        </div>

        {/* Código CIIU */}
        <div>
          <label className={labelClass}>Código CIIU</label>
          <input
            type="number"
            name="ciiu_id"
            value={formData.ciiu_id}
            onChange={handleChange}
            placeholder="Ej: 4711"
            className={inputClass}
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Opcional. Clasificación Industrial Internacional Uniforme.
          </p>
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
            Giro activo
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
          {isSubmitting ? 'Guardando...' : 'Guardar giro'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
