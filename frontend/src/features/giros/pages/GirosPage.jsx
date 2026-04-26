import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import ExpedienteHeader from '@features/expedientes/components/ExpedienteHeader'
import BuscadorGiro from '../components/BuscadorGiro'
import GiroCard from '../components/GiroCard'
import GiroFormModal from '../components/GiroFormModal'
import { dashboardApi } from '@api/dashboardApi'
import { girosApi } from '@api/girosApi'
import useGirosStore from '@store/girosStore'

export default function GirosPage() {
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [menus,        setMenus]        = useState([])
  const [giros,        setGiros]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [buscado,      setBuscado]      = useState(false)
  const [modalAgregar, setModalAgregar] = useState(false)

  const { busqueda, setBusqueda } = useGirosStore()

  const busquedaInicialRef = useRef(busqueda)

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  const ejecutarBusqueda = useCallback(async (params) => {
    setLoading(true)
    setBuscado(true)
    try {
      const res = await girosApi.buscar(params)
      setGiros(res.data)
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al buscar giros'
      toast.error(msg)
      setGiros([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Restaurar última búsqueda al montar
  useEffect(() => {
    if (busquedaInicialRef.current) {
      ejecutarBusqueda(busquedaInicialRef.current)
    }
  }, [ejecutarBusqueda])

  const handleBuscar = (params) => {
    setBusqueda(params)
    ejecutarBusqueda(params)
  }

  const handleActualizar = () => {
    const ultima = useGirosStore.getState().busqueda
    // Si nunca se buscó, traer todos; si hay búsqueda previa, repetirla
    ejecutarBusqueda(ultima ?? {})
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <ExpedienteHeader
            titulo="Giros"
            subtitulo="Gestione los giros comerciales registrados en el sistema"
            onActualizar={handleActualizar}
            onAgregar={() => setModalAgregar(true)}
            labelAgregar="Agregar giro"
          />

          {/* Buscador */}
          <BuscadorGiro
            onBuscar={handleBuscar}
            loading={loading}
            initialParams={busquedaInicialRef.current}
          />

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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  {giros.length}{' '}
                  {giros.length === 1 ? 'giro encontrado' : 'giros encontrados'}
                </p>
              </div>

              {/* Lista */}
              {giros.length > 0 ? (
                <div className="space-y-3">
                  {giros.map((g) => (
                    <GiroCard key={g.id} giro={g} onRefrescar={handleActualizar} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No se encontraron giros con los criterios indicados.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal agregar giro */}
      <GiroFormModal
        isOpen={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onSuccess={() => {
          setModalAgregar(false)
          handleActualizar()
        }}
      />
    </div>
  )
}
