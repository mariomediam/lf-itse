import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import ExpedienteHeader from '@features/expedientes/components/ExpedienteHeader'
import BuscadorItse from '../components/BuscadorItse'
import ItseCard from '../components/ItseCard'
import AgregarItseModal from '../components/AgregarItseModal'
import { dashboardApi } from '@api/dashboardApi'
import { itseApi } from '@api/itseApi'
import useItseStore from '@store/itseStore'

export default function ItsePage() {
  const navigate = useNavigate()
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [menus,        setMenus]        = useState([])
  const [itses,        setItses]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [buscado,      setBuscado]      = useState(false)
  const [modalAgregar, setModalAgregar] = useState(false)

  const { busqueda, setBusqueda } = useItseStore()

  const busquedaInicialRef = useRef(busqueda)

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  const ejecutarBusqueda = useCallback(async (filtro, valor) => {
    setLoading(true)
    setBuscado(true)
    try {
      const res = await itseApi.buscar(filtro, valor)
      setItses(res.data)
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al buscar certificados ITSE'
      toast.error(msg)
      setItses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (busquedaInicialRef.current) {
      ejecutarBusqueda(busquedaInicialRef.current.filtro, busquedaInicialRef.current.valor)
    }
  }, [ejecutarBusqueda])

  const handleBuscar = (filtro, valor) => {
    setBusqueda(filtro, valor)
    ejecutarBusqueda(filtro, valor)
  }

  const handleActualizar = () => {
    const ultima = useItseStore.getState().busqueda
    if (ultima) ejecutarBusqueda(ultima.filtro, ultima.valor)
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <ExpedienteHeader
            titulo="Certificado ITSE"
            subtitulo="Gestión integral de certificados de Inspección Técnica de Seguridad en Defensa Civil"
            onActualizar={handleActualizar}
            onAgregar={() => setModalAgregar(true)}
            labelAgregar="Agregar ITSE"
          />

          {/* Buscador */}
          <BuscadorItse
            onBuscar={handleBuscar}
            loading={loading}
            initialFiltro={busquedaInicialRef.current?.filtro}
            initialValor={busquedaInicialRef.current?.valor}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  {itses.length}{' '}
                  {itses.length === 1
                    ? 'ITSE encontrada'
                    : 'ITSE encontradas'}
                </p>
              </div>

              {/* Lista */}
              {itses.length > 0 ? (
                <div className="space-y-3">
                  {itses.map((itse) => (
                    <ItseCard
                      key={itse.id}
                      itse={itse}
                      onRefrescar={handleActualizar}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No se encontraron certificados ITSE con los criterios indicados.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal para iniciar alta de ITSE */}
      <AgregarItseModal
        isOpen={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onSuccess={({ expedienteId, numeroExpediente, anio }) => {
          navigate('/certificados-itse/nuevo', {
            state: { expedienteId, numeroExpediente, anio },
          })
        }}
      />
    </div>
  )
}
