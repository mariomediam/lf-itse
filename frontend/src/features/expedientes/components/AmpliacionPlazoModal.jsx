import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { expedientesApi } from '@api/expedientesApi'

// ── Estilos comunes ───────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatNumeroExpediente = (numero, fechaRecepcion) => {
  const anio = new Date(fechaRecepcion).getFullYear()
  return `${String(numero).padStart(4, '0')}-${anio}`
}

const hoyISO = () => new Date().toISOString().split('T')[0]

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoCancelar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const IconoGuardar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
)

// ── Estado inicial ────────────────────────────────────────────────────────────

const estadoInicial = {
  fecha_suspension: hoyISO(),
  dias_ampliacion: 1,
  motivo_ampliacion: '',
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Modal para registrar la ampliación de plazo de un expediente.
 *
 * Props
 * -----
 * isOpen      : bool
 * onClose     : () => void
 * onSuccess   : () => void  — se llama tras guardar para refrescar la lista
 * expediente  : object      — fila del expediente (id, numero_expediente, fecha_recepcion)
 */
export default function AmpliacionPlazoModal({ isOpen, onClose, onSuccess, expediente }) {
  const [formData, setFormData] = useState(estadoInicial)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const numeroExpediente = expediente
    ? formatNumeroExpediente(expediente.numero_expediente, expediente.fecha_recepcion)
    : ''

  const handleChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }))
  }

  const handleClose = () => {
    setFormData(estadoInicial)
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.fecha_suspension) {
      toast.error('Ingrese la fecha de suspensión')
      return
    }
    if (!formData.dias_ampliacion || formData.dias_ampliacion < 1) {
      toast.error('Los días de ampliación deben ser al menos 1')
      return
    }
    if (!formData.motivo_ampliacion.trim()) {
      toast.error('Ingrese el motivo de ampliación')
      return
    }

    setIsSubmitting(true)
    try {
      await expedientesApi.ampliarPlazo(expediente.id, {
        fecha_suspension: formData.fecha_suspension,
        dias_ampliacion: formData.dias_ampliacion,
        motivo_ampliacion: formData.motivo_ampliacion.trim(),
      })
      toast.success('Ampliación de plazo registrada correctamente')
      handleClose()
      onSuccess?.()
    } catch (err) {
      const data = err.response?.data
      const msg =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Error al registrar la ampliación de plazo'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} size="lg" onClose={handleClose}>

      {/* ── Cabecera ── */}
      <ModalHeader className="border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            Registrar ampliación de plazo
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-5 space-y-5">

        {/* Número de expediente */}
        <p className="text-xl font-bold text-gray-800">
          Expediente {numeroExpediente}
        </p>

        {/* Fecha de suspensión + Días de ampliación */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Fecha de suspensión</label>
            <input
              type="date"
              name="fecha_suspension"
              value={formData.fecha_suspension}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Días de ampliación</label>
            <input
              type="number"
              name="dias_ampliacion"
              value={formData.dias_ampliacion}
              onChange={handleChange}
              min={1}
              className={inputClass}
            />
          </div>
        </div>

        {/* Motivo de ampliación */}
        <div>
          <label className={labelClass}>Motivo de ampliación</label>
          <textarea
            name="motivo_ampliacion"
            value={formData.motivo_ampliacion}
            onChange={handleChange}
            rows={4}
            placeholder="Describa el motivo de la ampliación..."
            className={inputClass + ' resize-none'}
          />
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
          <IconoGuardar />
          {isSubmitting ? 'Guardando...' : 'Guardar ampliación'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
