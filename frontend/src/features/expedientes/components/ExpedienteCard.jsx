import { useState, useRef, useEffect } from 'react'
import AmpliacionPlazoModal from './AmpliacionPlazoModal'
import DenegarLicenciaModal from './DenegarLicenciaModal'
import ItseDesfavorableModal from './ItseDesfavorableModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const formatNumeroExpediente = (numero, fechaRecepcion) => {
  const anio = new Date(fechaRecepcion).getFullYear()
  return `${String(numero).padStart(4, '0')}-${anio}`
}

const getStatusText = ({ licencia_pendiente, itse_pendiente }) => {
  if (licencia_pendiente && itse_pendiente) return 'ITSE y licencia pendiente'
  if (itse_pendiente)    return 'ITSE pendiente'
  if (licencia_pendiente) return 'Licencia pendiente'
  return null
}

const esFinalizado = ({ licencia_pendiente, itse_pendiente }) =>
  !licencia_pendiente && !itse_pendiente

// ── Iconos del menú contextual ────────────────────────────────────────────────

const IconoVer        = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
const IconoModificar  = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
const IconoAmpliar    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
const IconoRechazar   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
const IconoItseDes    = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
const IconoAdjuntos   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
const IconoEliminar   = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>

// ── Menú contextual ───────────────────────────────────────────────────────────

function MenuContextual({ expediente, onAmpliarPlazo, onDenegarLicencia, onItseDesfavorable }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [abierto])

  const opciones = [
    { label: 'Ver',               icono: <IconoVer />,       onClick: null,             disabled: false,                          danger: false },
    { label: 'Modificar',         icono: <IconoModificar />,  onClick: null,             disabled: false,                          danger: false },
    { label: 'Ampliar plazo',     icono: <IconoAmpliar />,    onClick: onAmpliarPlazo,   disabled: false,                          danger: false },
    { label: 'Denegar licencia',  icono: <IconoRechazar />,   onClick: onDenegarLicencia, disabled: !expediente.licencia_pendiente, danger: false },
    { label: 'ITSE desfavorable', icono: <IconoItseDes />,    onClick: onItseDesfavorable, disabled: !expediente.itse_pendiente,   danger: false },
    { label: 'Documentos adjuntos', icono: <IconoAdjuntos />, onClick: null,             disabled: false,                          danger: false },
    { label: 'Eliminar',          icono: <IconoEliminar />,   onClick: null,             disabled: false,                          danger: true  },
  ]

  const handleOpcion = (op) => {
    setAbierto(false)
    op.onClick?.()
  }

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Opciones del expediente"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 top-8 z-50 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {opciones.map((op) => (
            <button
              key={op.label}
              type="button"
              disabled={op.disabled}
              onClick={() => handleOpcion(op)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                op.disabled
                  ? 'text-gray-300 cursor-not-allowed'
                  : op.danger
                    ? 'text-danger hover:bg-red-50'
                    : 'text-gray-700 hover:bg-gray-50',
              ].join(' ')}
            >
              {op.icono}
              {op.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

/**
 * Tarjeta de expediente para la página de administración.
 *
 * Props
 * -----
 * expediente  : object   — fila del endpoint /api/lf-itse/expedientes/buscar/
 * onRefrescar : () => void — callback para refrescar la lista tras una acción
 */
export default function ExpedienteCard({ expediente, onRefrescar }) {
  const [modalAmpliacion,    setModalAmpliacion]    = useState(false)
  const [modalDenegarLic,    setModalDenegarLic]    = useState(false)
  const [modalItseDesf,      setModalItseDesf]      = useState(false)

  const finalizado  = esFinalizado(expediente)
  const statusText  = getStatusText(expediente)
  const { dias_habiles_restantes, mostrar_alerta } = expediente

  const diasLabel = dias_habiles_restantes === 1
    ? '1 día para vencer plazo'
    : `${dias_habiles_restantes} días para vencer plazo`

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 relative sm:static">
        {/* En móvil: botón absoluto en esquina superior derecha
            En sm+:   parte del flujo flex normal             */}
        <div className="absolute top-3 right-3 sm:hidden">
          <MenuContextual
            expediente={expediente}
            onAmpliarPlazo={() => setModalAmpliacion(true)}
            onDenegarLicencia={() => setModalDenegarLic(true)}
            onItseDesfavorable={() => setModalItseDesf(true)}
          />
        </div>

        <div className="flex items-start justify-between gap-4">

          {/* Información — en móvil usa todo el ancho (pr deja espacio al botón absoluto) */}
          <div className="flex-1 min-w-0 pr-8 sm:pr-0">
            {/* Cabecera: número + badges */}
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-800">
                Expediente {formatNumeroExpediente(expediente.numero_expediente, expediente.fecha_recepcion)}
              </span>

              {finalizado ? (
                <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-success text-white">
                  Finalizado
                </span>
              ) : (
                <>
                  {/* Badge días */}
                  <span className={[
                    'px-3 py-0.5 rounded-full text-xs font-semibold',
                    mostrar_alerta
                      ? 'bg-danger text-white'
                      : 'border border-gray-400 text-gray-700',
                  ].join(' ')}>
                    {diasLabel}
                  </span>

                  {/* Badge estado */}
                  {statusText && (
                    <span className="px-3 py-0.5 rounded-full text-xs font-medium border border-gray-400 text-gray-700">
                      {statusText}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Tipo de procedimiento */}
            <p className="text-sm text-gray-700 font-medium mb-1 line-clamp-1" title={expediente.nombre_procedimiento}>
              {expediente.nombre_procedimiento}
            </p>

            {/* Fechas */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-0.5 text-xs text-gray-500 mb-1">
              <span>
                Fecha de solicitud:{' '}
                <strong className="text-gray-700">{formatFecha(expediente.fecha_recepcion)}</strong>
              </span>
              {!finalizado && (
                <span>
                  Fin de plazo:{' '}
                  <strong className="text-gray-700">{formatFecha(expediente.fecha_vencimiento)}</strong>
                </span>
              )}
            </div>

            {/* Solicitante */}
            <p className="text-xs text-gray-500">
              Solicitante:{' '}
              <strong className="text-gray-700">{expediente.solicitante_nombre}</strong>
            </p>
          </div>

          {/* Menú de 3 puntos — solo visible en sm+ (en móvil está posicionado arriba) */}
          <div className="hidden sm:block shrink-0">
            <MenuContextual
              expediente={expediente}
              onAmpliarPlazo={() => setModalAmpliacion(true)}
              onDenegarLicencia={() => setModalDenegarLic(true)}
              onItseDesfavorable={() => setModalItseDesf(true)}
            />
          </div>
        </div>
      </div>

      {/* Modal ampliación de plazo */}
      <AmpliacionPlazoModal
        isOpen={modalAmpliacion}
        onClose={() => setModalAmpliacion(false)}
        onSuccess={onRefrescar}
        expediente={expediente}
      />

      {/* Modal denegar licencia de funcionamiento */}
      <DenegarLicenciaModal
        isOpen={modalDenegarLic}
        onClose={() => setModalDenegarLic(false)}
        onSuccess={onRefrescar}
        expediente={expediente}
      />

      {/* Modal ITSE desfavorable */}
      <ItseDesfavorableModal
        isOpen={modalItseDesf}
        onClose={() => setModalItseDesf(false)}
        onSuccess={onRefrescar}
        expediente={expediente}
      />
    </>
  )
}
