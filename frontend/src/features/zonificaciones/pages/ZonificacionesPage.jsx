import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import ExpedienteHeader from '@features/expedientes/components/ExpedienteHeader'
import BuscadorZonificacion from '../components/BuscadorZonificacion'
import ZonificacionCard from '../components/ZonificacionCard'
import ZonificacionFormModal from '../components/ZonificacionFormModal'
import { dashboardApi } from '@api/dashboardApi'
import { zonificacionesApi } from '@api/zonificacionesApi'
import useZonificacionesStore from '@store/zonificacionesStore'

export default function ZonificacionesPage() {
  const [sidebarOpen,     setSidebarOpen]     = useState(true)
  const [menus,           setMenus]           = useState([])
  const [todasZons,       setTodasZons]       = useState([])   // resultado del servidor
  const [zonificaciones,  setZonificaciones]  = useState([])   // resultado filtrado por texto
  const [loading,         setLoading]         = useState(false)
  const [buscado,         setBuscado]         = useState(false)
  const [modalAgregar,    setModalAgregar]    = useState(false)

  const { params, setParams } = useZonificacionesStore()

  const paramsInicialRef = useRef(params)

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  // Aplica el filtro de texto sobre los resultados ya cargados del servidor
  const aplicarFiltroTexto = (lista, texto) => {
    if (!texto) return lista
    const q = texto.toLowerCase()
    return lista.filter(
      (z) =>
        z.nombre.toLowerCase().includes(q) ||
        z.codigo.toLowerCase().includes(q),
    )
  }

  const ejecutarBusqueda = useCallback(async (p) => {
    setLoading(true)
    setBuscado(true)
    try {
      const queryParams = {}
      if (p?.esta_activo) queryParams.esta_activo = p.esta_activo
      const res = await zonificacionesApi.listar(queryParams)
      setTodasZons(res.data)
      setZonificaciones(aplicarFiltroTexto(res.data, p?.texto))
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al cargar las zonificaciones'
      toast.error(msg)
      setTodasZons([])
      setZonificaciones([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Restaurar última búsqueda al montar
  useEffect(() => {
    if (paramsInicialRef.current) {
      ejecutarBusqueda(paramsInicialRef.current)
    }
  }, [ejecutarBusqueda])

  const handleBuscar = (p) => {
    setParams(p)
    ejecutarBusqueda(p)
  }

  const handleActualizar = () => {
    const ultima = useZonificacionesStore.getState().params
    ejecutarBusqueda(ultima ?? {})
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <ExpedienteHeader
            titulo="Zonificaciones"
            subtitulo="Gestione las zonificaciones registradas en el sistema"
            onActualizar={handleActualizar}
            onAgregar={() => setModalAgregar(true)}
            labelAgregar="Agregar zonificación"
          />

          {/* Buscador */}
          <BuscadorZonificacion
            onBuscar={handleBuscar}
            loading={loading}
            initialParams={paramsInicialRef.current}
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
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  {zonificaciones.length}{' '}
                  {zonificaciones.length === 1 ? 'zonificación encontrada' : 'zonificaciones encontradas'}
                  {todasZons.length !== zonificaciones.length && (
                    <span className="text-gray-400 ml-1">
                      (de {todasZons.length} en total)
                    </span>
                  )}
                </p>
              </div>

              {/* Lista */}
              {zonificaciones.length > 0 ? (
                <div className="space-y-3">
                  {zonificaciones.map((z) => (
                    <ZonificacionCard key={z.id} zonificacion={z} onRefrescar={handleActualizar} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No se encontraron zonificaciones con los criterios indicados.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal agregar zonificación */}
      <ZonificacionFormModal
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
