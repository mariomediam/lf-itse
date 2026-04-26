import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import ExpedienteHeader from '@features/expedientes/components/ExpedienteHeader'
import BuscadorUsuario from '../components/BuscadorUsuario'
import UsuarioCard from '../components/UsuarioCard'
import UsuarioFormModal from '../components/UsuarioFormModal'
import { dashboardApi } from '@api/dashboardApi'
import { usuariosApi } from '@api/usuariosApi'
import useUsuariosStore from '@store/usuariosStore'

export default function UsuariosPage() {
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [menus,        setMenus]        = useState([])
  const [usuarios,     setUsuarios]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modalAgregar, setModalAgregar] = useState(false)

  const { busqueda, setBusqueda } = useUsuariosStore()
  const [textoBusqueda, setTextoBusqueda] = useState(busqueda?.texto ?? '')

  // Cargar menú
  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  // Cargar lista completa de usuarios
  const cargarUsuarios = useCallback(async () => {
    setLoading(true)
    try {
      const res = await usuariosApi.listar()
      setUsuarios(res.data)
    } catch {
      toast.error('Error al cargar los usuarios')
      setUsuarios([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarUsuarios()
  }, [cargarUsuarios])

  // Filtrado en el cliente
  const usuariosFiltrados = useMemo(() => {
    if (!textoBusqueda.trim()) return usuarios
    const q = textoBusqueda.toLowerCase()
    return usuarios.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      (u.first_name ?? '').toLowerCase().includes(q) ||
      (u.last_name  ?? '').toLowerCase().includes(q) ||
      (u.email      ?? '').toLowerCase().includes(q) ||
      (u.nombre_completo ?? '').toLowerCase().includes(q)
    )
  }, [usuarios, textoBusqueda])

  const handleBuscar = (texto) => {
    setBusqueda(texto)
    setTextoBusqueda(texto)
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <ExpedienteHeader
            titulo="Usuarios"
            subtitulo="Gestione los usuarios del sistema y sus permisos de acceso"
            onActualizar={cargarUsuarios}
            onAgregar={() => setModalAgregar(true)}
            labelAgregar="Agregar usuario"
          />

          {/* Buscador */}
          <BuscadorUsuario
            onBuscar={handleBuscar}
            loading={loading}
            initialTexto={busqueda?.texto}
          />

          {/* Spinner */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {/* Resultados */}
          {!loading && (
            <>
              {/* Contador */}
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  {usuariosFiltrados.length}{' '}
                  {usuariosFiltrados.length === 1 ? 'usuario encontrado' : 'usuarios encontrados'}
                  {textoBusqueda && ` para "${textoBusqueda}"`}
                </p>
              </div>

              {usuariosFiltrados.length > 0 ? (
                <div className="space-y-3">
                  {usuariosFiltrados.map((u) => (
                    <UsuarioCard key={u.id} usuario={u} onRefrescar={cargarUsuarios} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  {textoBusqueda
                    ? 'No se encontraron usuarios con los criterios indicados.'
                    : 'No hay usuarios registrados en el sistema.'}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal agregar usuario */}
      <UsuarioFormModal
        isOpen={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onSuccess={() => {
          setModalAgregar(false)
          cargarUsuarios()
        }}
      />
    </div>
  )
}
