import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { itseApi } from '@api/itseApi'

/**
 * Modal para registrar la fecha de notificación de entrega de un ITSE.
 *
 * Props
 * -----
 * isOpen       : bool
 * onClose      : () => void
 * itse         : object  — datos del ITSE (id, numero_itse, fecha_expedicion)
 * onNotificado : () => void  — callback para refrescar la lista tras guardar
 */
export default function RegistrarNotificacionItseModal({ isOpen, onClose, itse, onNotificado }) {
  const [fechaNotificacion, setFechaNotificacion] = useState('')
  const [guardando,         setGuardando]         = useState(false)

  const formatNumeroItse = (numero, fechaExpedicion) => {
    const anio = new Date(fechaExpedicion).getFullYear()
    return `ITSE ${String(numero).padStart(4, '0')}-${anio}`
  }

  const handleClose = () => {
    setFechaNotificacion('')
    onClose()
  }

  const handleGuardar = async () => {
    if (!fechaNotificacion) {
      toast.error('Ingrese la fecha de notificación')
      return
    }

    setGuardando(true)
    try {
      await itseApi.registrarNotificacion(itse.id, { fecha_notificacion: fechaNotificacion })
      toast.success('Notificación registrada correctamente')
      setFechaNotificacion('')
      onNotificado?.()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar la notificación'
      toast.error(msg)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>

      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            Registrar notificación de entrega de ITSE
          </span>
        </div>
      </ModalHeader>

      <ModalBody className="bg-white px-6 py-6">

        {/* Número de ITSE destacado */}
        {itse && (
          <div className="text-center mb-6">
            <span className="text-2xl font-bold text-primary">
              {formatNumeroItse(itse.numero_itse, itse.fecha_expedicion)}
            </span>
          </div>
        )}

        {/* Campo fecha y hora */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Fecha y hora de notificación <span className="text-danger">*</span>
          </label>
          <input
            type="datetime-local"
            value={fechaNotificacion}
            onChange={(e) => setFechaNotificacion(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

      </ModalBody>

      <ModalFooter className="border-t border-gray-200 bg-white flex justify-end gap-3">
        <button
          type="button"
          onClick={handleClose}
          disabled={guardando}
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
          onClick={handleGuardar}
          disabled={guardando}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white
                     rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {guardando ? 'Guardando...' : 'Guardar notificación'}
        </button>
      </ModalFooter>

    </Modal>
  )
}
