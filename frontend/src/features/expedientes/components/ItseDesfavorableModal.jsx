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

const IconoItse = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

// ── Estado inicial ────────────────────────────────────────────────────────────

const estadoInicial = {
  fecha_rechazo: hoyISO(),
  documento: '',
  observaciones: '',
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Modal para registrar la ITSE desfavorable de un expediente.
 *
 * Props
 * -----
 * isOpen     : bool
 * onClose    : () => void
 * onSuccess  : () => void  — se llama tras guardar para refrescar la lista
 * expediente : object      — fila del expediente (id, numero_expediente, fecha_recepcion)
 */
export default function ItseDesfavorableModal({ isOpen, onClose, onSuccess, expediente }) {
  const [formData, setFormData] = useState(estadoInicial)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const numeroExpediente = expediente
    ? formatNumeroExpediente(expediente.numero_expediente, expediente.fecha_recepcion)
    : ''

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleClose = () => {
    setFormData(estadoInicial)
    onClose()
  }

  const handleSubmit = async () => {
    if (!formData.fecha_rechazo) {
      toast.error('Ingrese la fecha')
      return
    }
    if (!formData.documento.trim()) {
      toast.error('Ingrese el documento de sustento')
      return
    }
    if (!formData.observaciones.trim()) {
      toast.error('Ingrese el motivo')
      return
    }

    setIsSubmitting(true)
    try {
      await expedientesApi.denegarItse(expediente.id, {
        fecha_rechazo: formData.fecha_rechazo,
        documento: formData.documento.trim(),
        observaciones: formData.observaciones.trim(),
      })
      toast.success('ITSE desfavorable registrada correctamente')
      handleClose()
      onSuccess?.()
    } catch (err) {
      const data = err.response?.data
      const msg =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Error al registrar la ITSE desfavorable'
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
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            ITSE desfavorable
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-5 space-y-5">

        {/* Número de expediente */}
        <p className="text-xl font-bold text-gray-800">
          Expediente {numeroExpediente}
        </p>

        {/* Fecha */}
        <div>
          <label className={labelClass}>Fecha</label>
          <input
            type="date"
            name="fecha_rechazo"
            value={formData.fecha_rechazo}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* Documento de sustento */}
        <div>
          <label className={labelClass}>Documento de sustento</label>
          <input
            type="text"
            name="documento"
            value={formData.documento}
            onChange={handleChange}
            placeholder="Ej: RG N° 045-2026-GDSV-MDVD/MPP"
            className={inputClass}
          />
        </div>

        {/* Motivo */}
        <div>
          <label className={labelClass}>Motivo</label>
          <textarea
            name="observaciones"
            value={formData.observaciones}
            onChange={handleChange}
            rows={4}
            placeholder="Describa el motivo de la ITSE desfavorable..."
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
          <IconoItse />
          {isSubmitting ? 'Guardando...' : 'ITSE desfavorable'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
