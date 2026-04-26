import { useState, useRef, useEffect } from 'react'
import TipoProcedimientoTupaFormModal from './TipoProcedimientoTupaFormModal'
import EliminarTipoProcedimientoTupaModal from './EliminarTipoProcedimientoTupaModal'

// ── Iconos del menú contextual ────────────────────────────────────────────────

const IconoModificar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const IconoEliminar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// ── Menú contextual ───────────────────────────────────────────────────────────

function MenuContextual({ onModificar, onEliminar }) {
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
    { label: 'Modificar', icono: <IconoModificar />, onClick: onModificar, danger: false },
    { label: 'Eliminar',  icono: <IconoEliminar />,  onClick: onEliminar,  danger: true  },
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
        aria-label="Opciones"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {abierto && (
        <div className="absolute right-0 top-8 z-50 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {opciones.map((op) => (
            <button
              key={op.label}
              type="button"
              onClick={() => handleOpcion(op)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors',
                op.danger
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
 * Tarjeta de tipo de procedimiento TUPA.
 *
 * Props
 * -----
 * tipo              : object
 * unidadesOrganicas : array  — para resolver el nombre de la unidad orgánica
 * onRefrescar       : () => void
 */
export default function TipoProcedimientoTupaCard({ tipo, unidadesOrganicas, onRefrescar }) {
  const [modalModificar, setModalModificar] = useState(false)
  const [modalEliminar,  setModalEliminar]  = useState(false)

  const unidad = unidadesOrganicas.find((u) => u.id === tipo.unidad_organica)

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 relative sm:static">

        {/* En móvil: botón absoluto */}
        <div className="absolute top-3 right-3 sm:hidden">
          <MenuContextual
            onModificar={() => setModalModificar(true)}
            onEliminar={() => setModalEliminar(true)}
          />
        </div>

        <div className="flex items-start justify-between gap-4">

          {/* Información */}
          <div className="flex-1 min-w-0 pr-8 sm:pr-0">

            {/* Nombre + código + badge estado */}
            <div className="flex items-center flex-wrap gap-2 mb-1.5">
              <span className="text-sm font-semibold text-gray-800 line-clamp-1">
                {tipo.nombre}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-gray-100 text-gray-600">
                {tipo.codigo}
              </span>
              <span className={[
                'px-2.5 py-0.5 rounded-full text-xs font-medium',
                tipo.esta_activo
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500',
              ].join(' ')}>
                {tipo.esta_activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {/* Unidad orgánica */}
            {unidad && (
              <p className="text-xs text-gray-500 mb-1.5">
                {unidad.sigla ? `${unidad.sigla} — ` : ''}{unidad.nombre}
              </p>
            )}

            {/* Plazos + flags */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>
                Plazo: <strong className="text-gray-700">{tipo.plazo_atencion_dias} días</strong>
              </span>
              <span>
                Alerta: <strong className="text-gray-700">{tipo.dias_alerta_vencimiento} días</strong>
              </span>
              {tipo.requiere_lf && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                  LF
                </span>
              )}
              {tipo.requiere_itse && (
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">
                  ITSE
                </span>
              )}
            </div>
          </div>

          {/* Menú — solo sm+ */}
          <div className="hidden sm:block shrink-0">
            <MenuContextual
              onModificar={() => setModalModificar(true)}
              onEliminar={() => setModalEliminar(true)}
            />
          </div>
        </div>
      </div>

      {/* Modal modificar */}
      <TipoProcedimientoTupaFormModal
        isOpen={modalModificar}
        onClose={() => setModalModificar(false)}
        onSuccess={() => {
          setModalModificar(false)
          onRefrescar()
        }}
        tipo={tipo}
        unidadesOrganicas={unidadesOrganicas}
      />

      {/* Modal eliminar */}
      <EliminarTipoProcedimientoTupaModal
        isOpen={modalEliminar}
        onClose={() => setModalEliminar(false)}
        onSuccess={onRefrescar}
        tipo={tipo}
      />
    </>
  )
}
