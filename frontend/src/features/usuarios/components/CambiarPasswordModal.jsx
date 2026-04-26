import { useState } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { usuariosApi } from '@api/usuariosApi'

// ── Estilos ───────────────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'placeholder:text-gray-400'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoCancelar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const IconoGuardar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
)

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Modal para cambiar solo la contraseña de un usuario.
 *
 * Props
 * -----
 * isOpen    : bool
 * onClose   : () => void
 * onSuccess : () => void
 * usuario   : object  — { id, username, nombre_completo }
 */
export default function CambiarPasswordModal({ isOpen, onClose, onSuccess, usuario }) {
  const [password,        setPassword]        = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [isSubmitting,    setIsSubmitting]    = useState(false)

  const resetForm = () => {
    setPassword('')
    setPasswordConfirm('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== passwordConfirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    setIsSubmitting(true)
    try {
      await usuariosApi.cambiarPassword(usuario.id, {
        password,
        password_confirm: passwordConfirm,
      })
      toast.success(`Contraseña del usuario "${usuario.username}" actualizada correctamente`)
      resetForm()
      onSuccess?.()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.values(data).flat().join(' ')
        toast.error(msgs || 'Error al cambiar la contraseña')
      } else {
        toast.error('Error al cambiar la contraseña')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>

      {/* ── Cabecera ── */}
      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            Cambiar contraseña
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-5">
        <p className="text-sm text-gray-600 mb-5">
          Cambiando la contraseña del usuario{' '}
          <span className="font-semibold text-gray-800">{usuario?.username}</span>
          {usuario?.nombre_completo && usuario.nombre_completo !== usuario.username && (
            <span className="text-gray-500"> ({usuario.nombre_completo})</span>
          )}
        </p>

        <form id="form-cambiar-password" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>
              Nueva contraseña <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className={inputClass}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className={labelClass}>
              Confirmar contraseña <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Repita la nueva contraseña"
              className={inputClass}
              autoComplete="new-password"
            />
          </div>

          {password && passwordConfirm && password !== passwordConfirm && (
            <p className="text-xs text-danger flex items-center gap-1">
              <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd" />
              </svg>
              Las contraseñas no coinciden
            </p>
          )}
        </form>
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
          type="submit"
          form="form-cambiar-password"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <IconoGuardar />
          )}
          {isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
