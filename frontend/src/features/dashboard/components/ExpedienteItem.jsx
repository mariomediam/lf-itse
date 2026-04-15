import { useNavigate } from 'react-router-dom'

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
  if (itse_pendiente) return 'ITSE pendiente'
  if (licencia_pendiente) return 'Licencia pendiente'
  return null
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Tarjeta de un expediente pendiente.
 * Se usa tanto en "Alertas prioritarias" como en "Bandeja de expedientes pendientes".
 *
 * Props
 * -----
 * expediente : object — fila del endpoint /api/lf-itse/expedientes/pendientes/
 */
export default function ExpedienteItem({ expediente }) {
  const navigate = useNavigate()
  const { dias_habiles_restantes, mostrar_alerta } = expediente

  const diasLabel =
    dias_habiles_restantes === 1
      ? '1 día para vencer plazo'
      : `${dias_habiles_restantes} días para vencer plazo`

  const statusText = getStatusText(expediente)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Información del expediente */}
      <div className="flex-1 min-w-0">
        {/* Cabecera: número + badges */}
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <span className="text-sm font-semibold text-gray-800">
            Expediente {formatNumeroExpediente(expediente.numero_expediente, expediente.fecha_recepcion)}
          </span>

          {/* Badge de días */}
          <span className={[
            'px-3 py-0.5 rounded-full text-xs font-semibold',
            mostrar_alerta
              ? 'bg-danger text-white'
              : 'border border-gray-400 text-gray-700',
          ].join(' ')}>
            {diasLabel}
          </span>

          {/* Badge de estado */}
          {statusText && (
            <span className="px-3 py-0.5 rounded-full text-xs font-medium border border-gray-400 text-gray-700">
              {statusText}
            </span>
          )}
        </div>

        {/* Tipo de procedimiento */}
        <p className="text-sm text-gray-700 font-medium mb-1 line-clamp-1" title={expediente.nombre}>
          {expediente.nombre}
        </p>

        {/* Fechas */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-0.5 text-xs text-gray-500 mb-1">
          <span>
            Fecha de solicitud:{' '}
            <strong className="text-gray-700">{formatFecha(expediente.fecha_recepcion)}</strong>
          </span>
          <span>
            Fin de plazo:{' '}
            <strong className="text-gray-700">{formatFecha(expediente.fecha_vencimiento)}</strong>
          </span>
        </div>

        {/* Solicitante */}
        <p className="text-xs text-gray-500">
          Solicitante:{' '}
          <strong className="text-gray-700">{expediente.persona_nombre}</strong>
        </p>
      </div>

      {/* Botón de acción */}
      <button
        type="button"
        onClick={() => navigate(`/expedientes/${expediente.id}`)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors sm:shrink-0 w-full sm:w-auto"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        Ver expediente
      </button>
    </div>
  )
}
