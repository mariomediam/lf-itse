import { useState, useRef, useEffect } from 'react'
import UsuarioFormModal from './UsuarioFormModal'
import CambiarPasswordModal from './CambiarPasswordModal'
import EliminarUsuarioModal from './EliminarUsuarioModal'

// ── Iconos del menú contextual ────────────────────────────────────────────────

const IconoModificar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const IconoPassword = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

const IconoEliminar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

// ── Menú contextual ───────────────────────────────────────────────────────────

function MenuContextual({ onModificar, onCambiarPassword, onEliminar }) {
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
    { label: 'Modificar',         icono: <IconoModificar />,  onClick: onModificar,        danger: false },
    { label: 'Cambiar contraseña', icono: <IconoPassword />,   onClick: onCambiarPassword,  danger: false },
    { label: 'Eliminar',          icono: <IconoEliminar />,   onClick: onEliminar,          danger: true  },
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
        aria-label="Opciones de usuario"
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

// ── Badge de permiso ──────────────────────────────────────────────────────────

function BadgePermiso({ activo, label }) {
  if (!activo) return null
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
    </span>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

/**
 * Tarjeta de usuario para la página de administración.
 *
 * Props
 * -----
 * usuario     : object
 * onRefrescar : () => void
 */
export default function UsuarioCard({ usuario, onRefrescar }) {
  const [modalModificar,       setModalModificar]       = useState(false)
  const [modalCambiarPassword, setModalCambiarPassword] = useState(false)
  const [modalEliminar,        setModalEliminar]        = useState(false)

  const perfil = usuario.perfil ?? {}
  const tienePermisos = perfil.expedientes || perfil.licencias || perfil.itse || perfil.admin

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 relative sm:static">

        {/* Menú en móvil */}
        <div className="absolute top-3 right-3 sm:hidden">
          <MenuContextual
            onModificar={() => setModalModificar(true)}
            onCambiarPassword={() => setModalCambiarPassword(true)}
            onEliminar={() => setModalEliminar(true)}
          />
        </div>

        <div className="flex items-start justify-between gap-4">

          {/* Información */}
          <div className="flex-1 min-w-0 pr-8 sm:pr-0">

            {/* Username + estado */}
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-800">
                {usuario.username}
              </span>
              <span className={[
                'px-2 py-0.5 rounded-full text-xs font-medium',
                usuario.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500',
              ].join(' ')}>
                {usuario.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            {/* Nombre completo */}
            {usuario.nombre_completo && usuario.nombre_completo !== usuario.username && (
              <p className="text-xs text-gray-600 mb-1">
                {usuario.nombre_completo}
              </p>
            )}

            {/* Correo */}
            {usuario.email && (
              <p className="text-xs text-gray-500 mb-2">{usuario.email}</p>
            )}

            {/* Permisos */}
            {tienePermisos ? (
              <div className="flex flex-wrap gap-1.5">
                <BadgePermiso activo={perfil.expedientes} label="Expedientes"  />
                <BadgePermiso activo={perfil.licencias}   label="Licencias"    />
                <BadgePermiso activo={perfil.itse}        label="ITSE"         />
                <BadgePermiso activo={perfil.admin}       label="Administración" />
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">Sin permisos asignados</p>
            )}
          </div>

          {/* Menú en escritorio */}
          <div className="hidden sm:block shrink-0">
            <MenuContextual
              onModificar={() => setModalModificar(true)}
              onCambiarPassword={() => setModalCambiarPassword(true)}
              onEliminar={() => setModalEliminar(true)}
            />
          </div>
        </div>
      </div>

      {/* Modal modificar */}
      <UsuarioFormModal
        isOpen={modalModificar}
        onClose={() => setModalModificar(false)}
        onSuccess={() => { setModalModificar(false); onRefrescar() }}
        usuario={usuario}
      />

      {/* Modal cambiar contraseña */}
      <CambiarPasswordModal
        isOpen={modalCambiarPassword}
        onClose={() => setModalCambiarPassword(false)}
        onSuccess={() => setModalCambiarPassword(false)}
        usuario={usuario}
      />

      {/* Modal eliminar */}
      <EliminarUsuarioModal
        isOpen={modalEliminar}
        onClose={() => setModalEliminar(false)}
        onSuccess={() => { setModalEliminar(false); onRefrescar() }}
        usuario={usuario}
      />
    </>
  )
}
