import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { tiposProcedimientoTupaApi } from '@api/tiposProcedimientoTupaApi'

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoCancelar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const IconoEliminar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Modal de confirmación para eliminar un tipo de procedimiento TUPA.
 *
 * Props
 * -----
 * isOpen    : bool
 * onClose   : () => void
 * onSuccess : () => void
 * tipo      : object  — { id, codigo, nombre }
 */
export default function EliminarTipoProcedimientoTupaModal({ isOpen, onClose, onSuccess, tipo }) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirmar = async () => {
    setIsSubmitting(true)
    try {
      await tiposProcedimientoTupaApi.eliminar(tipo.id)
      toast.success(`Tipo "${tipo.nombre}" eliminado correctamente`)
      onClose()
      onSuccess?.()
    } catch (err) {
      const data = err.response?.data
      const msg =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        'Error al eliminar el tipo de procedimiento'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} size="md" onClose={onClose}>

      {/* ── Cabecera ── */}
      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-danger">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            Eliminar tipo de procedimiento TUPA
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-6 space-y-4">

        <p className="text-xl font-bold text-gray-800 leading-snug">
          {tipo?.nombre}
        </p>

        {tipo?.codigo && (
          <p className="text-sm text-gray-600">
            Código: {tipo.codigo}
          </p>
        )}

        <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <svg className="w-5 h-5 text-danger shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div className="text-sm text-red-700 space-y-1">
            <p className="font-semibold">Esta acción es irreversible.</p>
            <p>
              No se podrá eliminar si el tipo de procedimiento está asignado a expedientes.
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-700">
          ¿Está seguro de que desea continuar?
        </p>
      </ModalBody>

      {/* ── Pie ── */}
      <ModalFooter className="border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
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
          onClick={handleConfirmar}
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-danger text-white
            rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <IconoEliminar />
          )}
          {isSubmitting ? 'Eliminando...' : 'Sí, eliminar'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
