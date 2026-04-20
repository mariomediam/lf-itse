import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { itseApi } from '@api/itseApi'

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

/**
 * Modal para registrar la inactivación de un certificado ITSE.
 *
 * Props
 * -----
 * isOpen      : bool
 * onClose     : () => void
 * itse        : object — id, numero_itse, fecha_expedicion
 * onInactivada : () => void — refresca el listado principal
 */
export default function InactivarItseModal({ isOpen, onClose, itse, onInactivada }) {
  const [estados,         setEstados]         = useState([])
  const [cargandoEstados, setCargandoEstados] = useState(false)
  const [estadoId,        setEstadoId]        = useState('')
  const [fechaEstado,     setFechaEstado]     = useState('')
  const [documento,       setDocumento]       = useState('')
  const [observaciones,   setObservaciones]   = useState('')
  const [guardando,       setGuardando]       = useState(false)

  const formatNumeroItse = (numero, fechaExpedicion) => {
    const anio = new Date(fechaExpedicion).getFullYear()
    return `ITSE ${String(numero).padStart(4, '0')}-${anio}`
  }

  useEffect(() => {
    if (!isOpen) return
    setCargandoEstados(true)
    itseApi
      .getEstadosInactivosItse()
      .then((res) => setEstados(res.data))
      .catch(() => toast.error('Error al cargar los tipos de inactivación'))
      .finally(() => setCargandoEstados(false))
  }, [isOpen])

  const resetForm = () => {
    setEstadoId('')
    setFechaEstado('')
    setDocumento('')
    setObservaciones('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleGuardar = async () => {
    if (!estadoId)          { toast.error('Seleccione el tipo de inactivación'); return }
    if (!fechaEstado)       { toast.error('Ingrese la fecha de inactivación');   return }
    if (!documento.trim())  { toast.error('Ingrese el documento sustentario');   return }
    if (!observaciones.trim()) { toast.error('Ingrese las observaciones');       return }

    setGuardando(true)
    try {
      await itseApi.inactivarItse({
        itse_id:      itse.id,
        estado_id:    Number(estadoId),
        fecha_estado: fechaEstado,
        documento:    documento.trim(),
        observaciones: observaciones.trim(),
      })
      toast.success('Inactivación registrada correctamente')
      resetForm()
      onInactivada?.()
      onClose()
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al registrar la inactivación'
      toast.error(msg)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>

      <ModalHeader className="bg-white border-b border-gray-200 flex-col items-start gap-1">
        <div className="flex items-center gap-2.5">
          <span className="text-danger">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            Inactivar ITSE
          </span>
        </div>
        <p className="text-xs text-gray-500 font-normal pl-7">
          Registro de anulación o revocatoria de ITSE otorgado
        </p>
      </ModalHeader>

      <ModalBody className="bg-white px-6 py-6">

        {itse && (
          <div className="text-center mb-6">
            <span className="text-2xl font-bold text-primary">
              {formatNumeroItse(itse.numero_itse, itse.fecha_expedicion)}
            </span>
          </div>
        )}

        <div className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Tipo de inactivación <span className="text-danger">*</span>
              </label>
              <select
                value={estadoId}
                onChange={(e) => setEstadoId(e.target.value)}
                disabled={cargandoEstados}
                className={inputClass}
              >
                <option value="">
                  {cargandoEstados ? 'Cargando...' : 'Seleccione un tipo'}
                </option>
                {estados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Fecha de inactivación <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={fechaEstado}
                onChange={(e) => setFechaEstado(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Documento sustentario <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value.slice(0, 100))}
              maxLength={100}
              placeholder="Ej. RG 045-2026-GSC/MDVD"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Observaciones <span className="text-danger">*</span>
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value.slice(0, 1000))}
              rows={5}
              maxLength={1000}
              placeholder="Detalle el motivo de la inactivación..."
              className={`${inputClass} resize-y`}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{observaciones.length}/1000</p>
          </div>

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
          className="flex items-center gap-2 px-5 py-2 bg-danger text-white
                     rounded-lg text-sm font-medium hover:bg-danger/90 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {guardando ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l3 3m0 0l-3 3m3-3H12" />
            </svg>
          )}
          {guardando ? 'Guardando...' : 'Guardar inactivación'}
        </button>
      </ModalFooter>

    </Modal>
  )
}
