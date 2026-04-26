import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import { toast } from 'sonner'
import { usuariosApi } from '@api/usuariosApi'

// ── Estilos comunes ───────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

// ── Estado inicial ────────────────────────────────────────────────────────────

const estadoInicial = {
  username:   '',
  first_name: '',
  last_name:  '',
  email:      '',
  is_active:  true,
  password:   '',
  perfil: {
    expedientes: false,
    licencias:   false,
    itse:        false,
    admin:       false,
  },
}

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoGuardar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 13l4 4L19 7" />
  </svg>
)

const IconoCancelar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

// ── Componente de checkbox de permiso ─────────────────────────────────────────

function CheckPermiso({ id, label, descripcion, checked, onChange }) {
  return (
    <label
      htmlFor={id}
      className={[
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        checked
          ? 'border-primary/40 bg-primary/5'
          : 'border-gray-200 hover:bg-gray-50',
      ].join(' ')}
    >
      <div className="relative mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div className={[
          'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
          checked ? 'bg-primary border-primary' : 'border-gray-300 bg-white',
        ].join(' ')}>
          {checked && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{descripcion}</p>
      </div>
    </label>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

/**
 * Modal para crear o modificar un usuario del sistema.
 *
 * Props
 * -----
 * isOpen    : bool
 * onClose   : () => void
 * onSuccess : () => void
 * usuario   : object | null  — si se pasa, entra en modo edición
 */
export default function UsuarioFormModal({ isOpen, onClose, onSuccess, usuario = null }) {
  const esEdicion = Boolean(usuario)

  const [form, setForm] = useState(estadoInicial)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Cargar datos del usuario al abrir en modo edición
  useEffect(() => {
    if (!isOpen) return

    if (esEdicion && usuario) {
      setForm({
        username:   usuario.username   ?? '',
        first_name: usuario.first_name ?? '',
        last_name:  usuario.last_name  ?? '',
        email:      usuario.email      ?? '',
        is_active:  usuario.is_active  ?? true,
        password:   '',
        perfil: {
          expedientes: usuario.perfil?.expedientes ?? false,
          licencias:   usuario.perfil?.licencias   ?? false,
          itse:        usuario.perfil?.itse         ?? false,
          admin:       usuario.perfil?.admin        ?? false,
        },
      })
    } else {
      setForm(estadoInicial)
    }
  }, [isOpen, esEdicion, usuario])

  const handleChange = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  const handlePerfilChange = (campo) => {
    setForm((prev) => ({
      ...prev,
      perfil: { ...prev.perfil, [campo]: !prev.perfil[campo] },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.username.trim()) {
      toast.error('El nombre de usuario es obligatorio')
      return
    }
    if (!esEdicion && !form.password) {
      toast.error('La contraseña es obligatoria al crear un usuario')
      return
    }
    if (!esEdicion && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }

    const payload = {
      username:   form.username.trim(),
      first_name: form.first_name.trim(),
      last_name:  form.last_name.trim(),
      email:      form.email.trim(),
      is_active:  form.is_active,
      perfil:     form.perfil,
    }
    if (form.password) payload.password = form.password

    setIsSubmitting(true)
    try {
      if (esEdicion) {
        await usuariosApi.actualizar(usuario.id, payload)
        toast.success('Usuario actualizado correctamente')
      } else {
        await usuariosApi.crear(payload)
        toast.success('Usuario creado correctamente')
      }
      onSuccess?.()
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msgs = Object.entries(data)
          .map(([campo, errores]) => {
            const lista = Array.isArray(errores) ? errores.join(', ') : String(errores)
            return campo === 'non_field_errors' ? lista : `${campo}: ${lista}`
          })
          .join('\n')
        toast.error(msgs || 'Error al guardar el usuario')
      } else {
        toast.error('Error al guardar el usuario')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal show={isOpen} size="lg" onClose={onClose}>

      {/* ── Cabecera ── */}
      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">
            {esEdicion ? 'Modificar usuario' : 'Agregar usuario'}
          </span>
        </div>
      </ModalHeader>

      {/* ── Cuerpo ── */}
      <ModalBody className="bg-white px-6 py-5">
        <form id="form-usuario" onSubmit={handleSubmit} className="space-y-5">

          {/* Datos de acceso */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Datos de acceso
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  Usuario de acceso (login) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  placeholder="ej: jperez"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className={labelClass}>
                  Contraseña {!esEdicion && <span className="text-danger">*</span>}
                  {esEdicion && <span className="text-gray-400 font-normal">(dejar en blanco para no cambiar)</span>}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder={esEdicion ? 'Sin cambios' : 'Mínimo 6 caracteres'}
                  className={inputClass}
                  autoComplete="new-password"
                />
              </div>

              <div className="flex items-center gap-3 pt-5">
                <label
                  htmlFor="is_active"
                  className="flex items-center gap-2.5 cursor-pointer select-none"
                >
                  <div className="relative">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                      className="sr-only"
                    />
                    <div
                      onClick={() => handleChange('is_active', !form.is_active)}
                      className={[
                        'w-10 h-5 rounded-full transition-colors cursor-pointer',
                        form.is_active ? 'bg-primary' : 'bg-gray-300',
                      ].join(' ')}
                    >
                      <div className={[
                        'w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5',
                        form.is_active ? 'translate-x-5' : 'translate-x-0.5',
                      ].join(' ')} />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {form.is_active ? 'Usuario activo' : 'Usuario inactivo'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Información personal */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Información personal
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Apellidos</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Apellidos del usuario"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Nombres</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Nombres del usuario"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="correo@municipio.gob.pe"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Permisos de acceso */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Permisos de acceso al sistema
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <CheckPermiso
                id="perm-expedientes"
                label="Expedientes"
                descripcion="Crear y gestionar expedientes"
                checked={form.perfil.expedientes}
                onChange={() => handlePerfilChange('expedientes')}
              />
              <CheckPermiso
                id="perm-licencias"
                label="Licencias de funcionamiento"
                descripcion="Emitir y administrar licencias"
                checked={form.perfil.licencias}
                onChange={() => handlePerfilChange('licencias')}
              />
              <CheckPermiso
                id="perm-itse"
                label="Certificados ITSE"
                descripcion="Emitir y administrar certificados ITSE"
                checked={form.perfil.itse}
                onChange={() => handlePerfilChange('itse')}
              />
              <CheckPermiso
                id="perm-admin"
                label="Administración"
                descripcion="Gestión de usuarios del sistema"
                checked={form.perfil.admin}
                onChange={() => handlePerfilChange('admin')}
              />
            </div>
          </div>

        </form>
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
          type="submit"
          form="form-usuario"
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
          {isSubmitting ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </ModalFooter>
    </Modal>
  )
}
