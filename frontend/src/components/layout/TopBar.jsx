import useAuthStore from '@store/authStore'

const getInitials = (user) => {
  const fn = user?.first_name?.trim()
  const ln = user?.last_name?.trim()
  if (fn && ln) return `${fn[0]}${ln[0]}`.toUpperCase()
  if (fn) return fn.slice(0, 2).toUpperCase()
  if (user?.username) return user.username.slice(0, 2).toUpperCase()
  return '?'
}

const getDisplayName = (user) => {
  const fn = user?.first_name?.trim()
  const ln = user?.last_name?.trim()
  if (fn && ln) return `${fn} ${ln}`
  if (fn) return fn
  return user?.username || ''
}

export default function TopBar({ onToggleSidebar }) {
  const { user } = useAuthStore()

  return (
    <header className="bg-primary text-white flex items-center justify-between px-4 py-3 shrink-0 shadow-md z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded hover:bg-white/10 transition-colors"
          aria-label="Alternar menú lateral"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <p className="text-xs font-medium opacity-75 leading-none">
            Municipalidad Distrital de Valle Dorado
          </p>
          <p className="text-sm font-semibold leading-tight mt-0.5">
            Sistema de Gestión de Licencias de Funcionamiento e ITSE
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="text-sm font-medium hidden sm:block">
          {getDisplayName(user)}
        </span>
        <div className="w-9 h-9 rounded-full bg-tertiary flex items-center justify-center text-sm font-bold shrink-0 select-none">
          {getInitials(user)}
        </div>
      </div>
    </header>
  )
}
