import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import { dashboardApi } from '@api/dashboardApi'
import { licenciasApi } from '@api/licenciasApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILTROS_VACIO = {
  titular_nombre: '',
  numero_licencia: '',
  anio_licencia: '',
  titular_numero_documento: '',
  conductor_numero_documento: '',
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function FiltrosForm({ filtros, onChange, onSubmit, onLimpiar, loading }) {
  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

  const labelClass = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6 no-print">
      <p className="text-sm font-semibold text-gray-700 mb-4">Filtros de búsqueda</p>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Titular */}
          <div>
            <label className={labelClass}>Nombre o razón social del titular</label>
            <input
              type="text"
              name="titular_nombre"
              value={filtros.titular_nombre}
              onChange={onChange}
              placeholder="Buscar por nombre o razón social..."
              className={inputClass}
            />
          </div>

          {/* Número de licencia */}
          <div>
            <label className={labelClass}>Número de licencia</label>
            <input
              type="number"
              name="numero_licencia"
              value={filtros.numero_licencia}
              onChange={onChange}
              placeholder="Ej. 125"
              min={1}
              className={inputClass}
            />
          </div>

          {/* Año de licencia */}
          <div>
            <label className={labelClass}>Año de emisión</label>
            <input
              type="number"
              name="anio_licencia"
              value={filtros.anio_licencia}
              onChange={onChange}
              placeholder="Ej. 2024"
              min={1900}
              className={inputClass}
            />
          </div>

          {/* Doc. titular */}
          <div>
            <label className={labelClass}>N.° de documento del titular</label>
            <input
              type="text"
              name="titular_numero_documento"
              value={filtros.titular_numero_documento}
              onChange={onChange}
              placeholder="DNI, RUC u otro..."
              className={inputClass}
            />
          </div>

          {/* Doc. conductor */}
          <div>
            <label className={labelClass}>N.° de documento del conductor</label>
            <input
              type="text"
              name="conductor_numero_documento"
              value={filtros.conductor_numero_documento}
              onChange={onChange}
              placeholder="DNI, RUC u otro..."
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm
                       font-medium rounded-lg hover:bg-primary/90 transition-colors
                       disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Buscar
          </button>
          <button
            type="button"
            onClick={onLimpiar}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm
                       font-medium rounded-lg hover:bg-gray-200 transition-colors
                       disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        </div>
      </form>
    </div>
  )
}

function EstadoBadge({ activo }) {
  return activo ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                     font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                     font-medium bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
      Inactiva
    </span>
  )
}

function TablaResultados({ licencias }) {
  const thClass = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap'
  const tdClass = 'px-3 py-2.5 text-sm text-gray-700 align-top'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass}>N.° Licencia</th>
              <th className={thClass}>N.° Expediente</th>
              <th className={thClass}>Titular</th>
              <th className={thClass}>Doc. Titular</th>
              <th className={thClass}>Conductor</th>
              <th className={thClass}>Doc. Conductor</th>
              <th className={thClass}>Nombre Comercial</th>
              <th className={thClass}>Dirección</th>
              <th className={thClass}>Giros</th>
              <th className={thClass}>Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {licencias.map((lic, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className={`${tdClass} font-medium text-primary whitespace-nowrap`}>
                  {lic.numero_licencia}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {lic.numero_expediente}
                </td>
                <td className={`${tdClass} max-w-[160px]`}>
                  {lic.titular_nombre || '-'}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {lic.titular_documentos || '-'}
                </td>
                <td className={`${tdClass} max-w-[160px]`}>
                  {lic.conductor_nombre || '-'}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {lic.conductor_documentos || '-'}
                </td>
                <td className={`${tdClass} max-w-[140px]`}>
                  {lic.nombre_comercial || '-'}
                </td>
                <td className={`${tdClass} max-w-[140px]`}>
                  {lic.direccion || '-'}
                </td>
                <td className={`${tdClass} max-w-[200px] text-xs text-gray-600`}>
                  {lic.giros || '-'}
                </td>
                <td className={tdClass}>
                  <EstadoBadge activo={lic.esta_activo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function ReporteLicenciasPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menus,       setMenus]       = useState([])
  const [filtros,     setFiltros]     = useState(FILTROS_VACIO)
  const [licencias,   setLicencias]   = useState([])
  const [loading,     setLoading]     = useState(false)
  const [buscado,     setBuscado]     = useState(false)

  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFiltros((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const params = {}
    if (filtros.titular_nombre.trim())
      params.titular_nombre = filtros.titular_nombre.trim()
    if (filtros.numero_licencia)
      params.numero_licencia = parseInt(filtros.numero_licencia, 10)
    if (filtros.anio_licencia)
      params.anio_licencia = parseInt(filtros.anio_licencia, 10)
    if (filtros.titular_numero_documento.trim())
      params.titular_numero_documento = filtros.titular_numero_documento.trim()
    if (filtros.conductor_numero_documento.trim())
      params.conductor_numero_documento = filtros.conductor_numero_documento.trim()

    if (Object.keys(params).length === 0) {
      toast.warning('Debe ingresar al menos un filtro de búsqueda')
      return
    }

    setLoading(true)
    setBuscado(true)
    try {
      const res = await licenciasApi.consultar(params)
      setLicencias(res.data)
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        'Error al consultar licencias de funcionamiento'
      toast.error(msg)
      setLicencias([])
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFiltros(FILTROS_VACIO)
    setLicencias([])
    setBuscado(false)
  }

  const handleImprimir = () => window.print()

  const handleExportarExcel = () => {
    if (licencias.length === 0) return

    const datos = licencias.map((lic) => ({
      'N.° Licencia':              lic.numero_licencia,
      'N.° Expediente':            lic.numero_expediente,
      'Titular':                   lic.titular_nombre        || '',
      'Doc. Identidad Titular':    lic.titular_documentos    || '',
      'Conductor':                 lic.conductor_nombre      || '',
      'Doc. Identidad Conductor':  lic.conductor_documentos  || '',
      'Nombre Comercial':          lic.nombre_comercial      || '',
      'Dirección':                 lic.direccion             || '',
      'Giros':                     lic.giros                 || '',
      'Estado':                    lic.esta_activo ? 'Activa' : 'Inactiva',
    }))

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Licencias')
    XLSX.writeFile(wb, 'reporte-licencias-funcionamiento.xlsx')
  }

  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          table { font-size: 9px; }
          th, td { padding: 3px 5px !important; }
        }
      `}</style>

      <div className="flex flex-col h-screen bg-neutral no-print-layout">
        {/* TopBar */}
        <div className="no-print">
          <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="no-print">
            <SideMenu menus={menus} isOpen={sidebarOpen} />
          </div>

          <main className="flex-1 overflow-y-auto p-6">
            {/* Encabezado */}
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-800">
                    Reporte — Licencias de Funcionamiento
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Consulta y exporta licencias de funcionamiento por distintos criterios
                  </p>
                </div>

                {/* Botones de acción — solo cuando hay resultados */}
                {buscado && !loading && licencias.length > 0 && (
                  <div className="flex items-center gap-2 no-print shrink-0">
                    <button
                      onClick={handleImprimir}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm
                                 font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimir
                    </button>
                    <button
                      onClick={handleExportarExcel}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm
                                 font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Exportar Excel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Formulario de filtros */}
            <FiltrosForm
              filtros={filtros}
              onChange={handleChange}
              onSubmit={handleSubmit}
              onLimpiar={handleLimpiar}
              loading={loading}
            />

            {/* Spinner */}
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
                  <svg className="w-5 h-5 text-gray-500 no-print" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {licencias.length}{' '}
                    {licencias.length === 1
                      ? 'licencia de funcionamiento encontrada'
                      : 'licencias de funcionamiento encontradas'}
                  </p>
                </div>

                {licencias.length > 0 ? (
                  <TablaResultados licencias={licencias} />
                ) : (
                  <div className="text-center py-12 text-gray-500 text-sm">
                    No se encontraron licencias con los criterios indicados.
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
