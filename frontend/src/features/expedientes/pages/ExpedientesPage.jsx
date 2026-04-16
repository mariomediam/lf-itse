import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import ExpedienteHeader from '../components/ExpedienteHeader'
import BuscadorExpediente from '../components/BuscadorExpediente'
import ExpedienteCard from '../components/ExpedienteCard'
import { dashboardApi } from '@api/dashboardApi'
import { expedientesApi } from '@api/expedientesApi'

export default function ExpedientesPage() {
  const navigate = useNavigate()
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [menus,        setMenus]        = useState([])
  const [expedientes,  setExpedientes]  = useState([])
  const [loading,      setLoading]      = useState(false)
  const [buscado,      setBuscado]      = useState(false)

  // Guarda la última búsqueda para poder refrescarla con "Actualizar datos"
  const [ultimaBusqueda, setUltimaBusqueda] = useState(null)

  // Carga del menú lateral al montar
  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  const ejecutarBusqueda = useCallback(async (filtro, valor) => {
    setLoading(true)
    setBuscado(true)
    try {
      const res = await expedientesApi.buscar(filtro, valor)
      setExpedientes(res.data)
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al buscar expedientes'
      toast.error(msg)
      setExpedientes([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleBuscar = (filtro, valor) => {
    setUltimaBusqueda({ filtro, valor })
    ejecutarBusqueda(filtro, valor)
  }

  const handleActualizar = () => {
    if (ultimaBusqueda) {
      ejecutarBusqueda(ultimaBusqueda.filtro, ultimaBusqueda.valor)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <ExpedienteHeader
            titulo="Expedientes"
            subtitulo="Visualice y gestione el flujo de solicitudes de licencias y certificados ITSE"
            onActualizar={handleActualizar}
            onAgregar={() => navigate('/expedientes/nuevo')}
          />

          {/* Buscador */}
          <BuscadorExpediente onBuscar={handleBuscar} loading={loading} />

          {/* Spinner de carga */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}

          {/* Resultados */}
          {!loading && buscado && (
            <>
              {/* Contador */}
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  {expedientes.length}{' '}
                  {expedientes.length === 1 ? 'expediente encontrado' : 'expedientes encontrados'}
                </p>
              </div>

              {/* Lista de expedientes */}
              {expedientes.length > 0 ? (
                <div className="space-y-3">
                  {expedientes.map((exp) => (
                    <ExpedienteCard key={exp.id} expediente={exp} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No se encontraron expedientes con los criterios indicados.
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
