import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { itseApi } from '@api/itseApi'

const ANIO_ACTUAL = new Date().getFullYear()

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'placeholder:text-gray-400'

/**
 * Modal inicial para agregar un certificado ITSE.
 * Solicita el número y año del expediente y verifica si se puede emitir.
 *
 * Props
 * -----
 * isOpen    : bool
 * onClose   : () => void
 * onSuccess : ({ expedienteId, numeroExpediente, anio }) => void
 */
export default function AgregarItseModal({ isOpen, onClose, onSuccess }) {
  const [numeroExpediente, setNumeroExpediente] = useState('')
  const [anio,             setAnio]             = useState(String(ANIO_ACTUAL))
  const [loading,          setLoading]          = useState(false)

  const handleClose = () => {
    setNumeroExpediente('')
    setAnio(String(ANIO_ACTUAL))
    onClose()
  }

  const handleContinuar = async () => {
    if (!numeroExpediente || !anio) {
      toast.error('Ingrese el número y año del expediente')
      return
    }

    setLoading(true)
    try {
      const res = await itseApi.verificarExpediente(
        Number(numeroExpediente),
        Number(anio),
      )
      const { se_puede_emitir_itse, expediente_id, mensaje } = res.data

      if (!se_puede_emitir_itse) {
        toast.error(mensaje)
        return
      }

      handleClose()
      onSuccess({ expedienteId: expediente_id, numeroExpediente: Number(numeroExpediente), anio: Number(anio) })
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al verificar el expediente'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>

      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            Agregar certificado ITSE
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="bg-white px-6 py-6 space-y-5">
        <p className="text-sm text-gray-500">
          Ingrese los datos del expediente para iniciar el registro del
          certificado ITSE.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Número del expediente <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={numeroExpediente}
            onChange={(e) => setNumeroExpediente(e.target.value)}
            placeholder="Ej. 159"
            className={inputClass}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Año del expediente <span className="text-danger">*</span>
          </label>
          <input
            type="number"
            min="2000"
            max="2099"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            className={inputClass}
          />
        </div>
      </ModalBody>

      <ModalFooter className="border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600
            rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleContinuar}
          disabled={loading || !numeroExpediente || !anio}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          Continuar
        </button>
      </ModalFooter>

    </Modal>
  )
}
