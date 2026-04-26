import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import ExpedienteHeader from '@features/expedientes/components/ExpedienteHeader'
import BuscadorTipoProcedimientoTupa from '../components/BuscadorTipoProcedimientoTupa'
import TipoProcedimientoTupaCard from '../components/TipoProcedimientoTupaCard'
import TipoProcedimientoTupaFormModal from '../components/TipoProcedimientoTupaFormModal'
import { dashboardApi } from '@api/dashboardApi'
import { tiposProcedimientoTupaApi } from '@api/tiposProcedimientoTupaApi'
import { unidadesOrganicasApi } from '@api/unidadesOrganicasApi'
import useTiposTupaStore from '@store/tiposTupaStore'

export default function TiposProcedimientoTupaPage() {
  const [sidebarOpen,       setSidebarOpen]       = useState(true)
  const [menus,             setMenus]             = useState([])
  const [todosTipos,        setTodosTipos]        = useState([])   // resultado del servidor
  const [tipos,             setTipos]             = useState([])   // filtrado client-side
  const [unidadesOrganicas, setUnidadesOrganicas] = useState([])
  const [loading,           setLoading]           = useState(false)
  const [buscado,           setBuscado]           = useState(false)
  const [modalAgregar,      setModalAgregar]      = useState(false)

  const { params, setParams } = useTiposTupaStore()

  const paramsInicialRef = useRef(params)

  // Carga del menú lateral
  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  // Carga de unidades orgánicas (una sola vez)
  useEffect(() => {
    unidadesOrganicasApi.listar()
      .then((res) => setUnidadesOrganicas(res.data))
      .catch(() => toast.error('Error al cargar las unidades orgánicas'))
  }, [])

  // Aplica los filtros de texto y estado en el cliente
  const aplicarFiltros = (lista, p) => {
    let resultado = lista
    if (p?.esta_activo === 'true') {
      resultado = resultado.filter((t) => t.esta_activo)
    } else if (p?.esta_activo === 'false') {
      resultado = resultado.filter((t) => !t.esta_activo)
    }
    if (p?.texto) {
      const q = p.texto.toLowerCase()
      resultado = resultado.filter(
        (t) =>
          t.nombre.toLowerCase().includes(q) ||
          t.codigo.toLowerCase().includes(q),
      )
    }
    return resultado
  }

  const ejecutarBusqueda = useCallback(async (p) => {
    setLoading(true)
    setBuscado(true)
    try {
      const res = await tiposProcedimientoTupaApi.listar()
      setTodosTipos(res.data)
      setTipos(aplicarFiltros(res.data, p))
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al cargar los tipos de procedimiento'
      toast.error(msg)
      setTodosTipos([])
      setTipos([])
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
    const ultima = useTiposTupaStore.getState().params
    ejecutarBusqueda(ultima ?? {})
  }

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">
          <ExpedienteHeader
            titulo="Tipos de procedimiento TUPA"
            subtitulo="Gestione los tipos de procedimiento del Texto Único de Procedimientos Administrativos"
            onActualizar={handleActualizar}
            onAgregar={() => setModalAgregar(true)}
            labelAgregar="Agregar tipo"
          />

          {/* Buscador */}
          <BuscadorTipoProcedimientoTupa
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  {tipos.length}{' '}
                  {tipos.length === 1 ? 'tipo encontrado' : 'tipos encontrados'}
                  {todosTipos.length !== tipos.length && (
                    <span className="text-gray-400 ml-1">
                      (de {todosTipos.length} en total)
                    </span>
                  )}
                </p>
              </div>

              {/* Lista */}
              {tipos.length > 0 ? (
                <div className="space-y-3">
                  {tipos.map((t) => (
                    <TipoProcedimientoTupaCard
                      key={t.id}
                      tipo={t}
                      unidadesOrganicas={unidadesOrganicas}
                      onRefrescar={handleActualizar}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-sm">
                  No se encontraron tipos de procedimiento con los criterios indicados.
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal agregar */}
      <TipoProcedimientoTupaFormModal
        isOpen={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onSuccess={() => {
          setModalAgregar(false)
          handleActualizar()
        }}
        unidadesOrganicas={unidadesOrganicas}
      />
    </div>
  )
}
