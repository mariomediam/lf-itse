import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import { dashboardApi } from '@api/dashboardApi'
import { expedientesApi } from '@api/expedientesApi'
import { formatFecha } from '@utils/formatters'

// ── Helpers ───────────────────────────────────────────────────────────────────

const FILTROS_VACIO = {
  solicitante_nombre: '',
  numero_expediente: '',
  anio_expediente: '',
  solicitante_numero_documento: '',
  representante_numero_documento: '',
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
          {/* Nombre solicitante */}
          <div>
            <label className={labelClass}>Nombre o razón social del solicitante</label>
            <input
              type="text"
              name="solicitante_nombre"
              value={filtros.solicitante_nombre}
              onChange={onChange}
              placeholder="Buscar por nombre o razón social..."
              className={inputClass}
            />
          </div>

          {/* Número de expediente */}
          <div>
            <label className={labelClass}>Número de expediente</label>
            <input
              type="number"
              name="numero_expediente"
              value={filtros.numero_expediente}
              onChange={onChange}
              placeholder="Ej. 125"
              min={1}
              className={inputClass}
            />
          </div>

          {/* Año */}
          <div>
            <label className={labelClass}>Año de recepción</label>
            <input
              type="number"
              name="anio_expediente"
              value={filtros.anio_expediente}
              onChange={onChange}
              placeholder="Ej. 2024"
              min={1900}
              className={inputClass}
            />
          </div>

          {/* Doc. solicitante */}
          <div>
            <label className={labelClass}>N.° de documento del solicitante</label>
            <input
              type="text"
              name="solicitante_numero_documento"
              value={filtros.solicitante_numero_documento}
              onChange={onChange}
              placeholder="DNI, RUC u otro..."
              className={inputClass}
            />
          </div>

          {/* Doc. representante */}
          <div>
            <label className={labelClass}>N.° de documento del representante legal</label>
            <input
              type="text"
              name="representante_numero_documento"
              value={filtros.representante_numero_documento}
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

function LicenciaBadge({ valor }) {
  if (!valor) return <span className="text-gray-400 text-xs">—</span>
  if (valor === 'IMPROCEDENTE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                       font-medium bg-red-100 text-red-700">
        Improcedente
      </span>
    )
  }
  return <span className="text-sm font-medium text-primary">{valor}</span>
}

function ItseBadge({ valor }) {
  if (!valor) return <span className="text-gray-400 text-xs">—</span>
  if (valor === 'DESFAVORABLE') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs
                       font-medium bg-orange-100 text-orange-700">
        Desfavorable
      </span>
    )
  }
  return <span className="text-sm font-medium text-primary">{valor}</span>
}

function TablaResultados({ expedientes }) {
  const thClass = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap'
  const tdClass = 'px-3 py-2.5 text-sm text-gray-700 align-top'

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className={thClass}>N.° Exp.</th>
              <th className={thClass}>Tipo TUPA</th>
              <th className={thClass}>Fecha Recepción</th>
              <th className={thClass}>Solicitante</th>
              <th className={thClass}>Doc. Solicitante</th>
              <th className={thClass}>Representante Legal</th>
              <th className={thClass}>Doc. Representante</th>
              <th className={thClass}>Lic. Funcionamiento</th>
              <th className={thClass}>ITSE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {expedientes.map((exp, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className={`${tdClass} font-medium text-primary whitespace-nowrap`}>
                  {exp.numero_expediente}
                </td>
                <td className={`${tdClass} max-w-[200px] text-xs text-gray-600`}>
                  {exp.tipo_procedimiento_tupa_nombre || '-'}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {formatFecha(exp.fecha_recepcion)}
                </td>
                <td className={`${tdClass} max-w-[160px]`}>
                  {exp.solicitante_nombre || '-'}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {exp.solicitante_documentos || '-'}
                </td>
                <td className={`${tdClass} max-w-[160px]`}>
                  {exp.representante_nombre || '-'}
                </td>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {exp.representante_documentos || '-'}
                </td>
                <td className={tdClass}>
                  <LicenciaBadge valor={exp.licencia_funcionamiento} />
                </td>
                <td className={tdClass}>
                  <ItseBadge valor={exp.itse} />
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

export default function ReporteExpedientesPage() {
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [menus,        setMenus]        = useState([])
  const [filtros,      setFiltros]      = useState(FILTROS_VACIO)
  const [expedientes,  setExpedientes]  = useState([])
  const [loading,      setLoading]      = useState(false)
  const [buscado,      setBuscado]      = useState(false)

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
    if (filtros.solicitante_nombre.trim())
      params.solicitante_nombre = filtros.solicitante_nombre.trim()
    if (filtros.numero_expediente)
      params.numero_expediente = parseInt(filtros.numero_expediente, 10)
    if (filtros.anio_expediente)
      params.anio_expediente = parseInt(filtros.anio_expediente, 10)
    if (filtros.solicitante_numero_documento.trim())
      params.solicitante_numero_documento = filtros.solicitante_numero_documento.trim()
    if (filtros.representante_numero_documento.trim())
      params.representante_numero_documento = filtros.representante_numero_documento.trim()

    if (Object.keys(params).length === 0) {
      toast.warning('Debe ingresar al menos un filtro de búsqueda')
      return
    }

    setLoading(true)
    setBuscado(true)
    try {
      const res = await expedientesApi.consultar(params)
      setExpedientes(res.data)
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        'Error al consultar expedientes'
      toast.error(msg)
      setExpedientes([])
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFiltros(FILTROS_VACIO)
    setExpedientes([])
    setBuscado(false)
  }

  const handleImprimir = () => window.print()

  const handleExportarExcel = () => {
    if (expedientes.length === 0) return

    const datos = expedientes.map((exp) => ({
      'N.° Expediente':               exp.numero_expediente,
      'Tipo TUPA':                    exp.tipo_procedimiento_tupa_nombre || '',
      'Fecha Recepción':              formatFecha(exp.fecha_recepcion),
      'Solicitante':                  exp.solicitante_nombre             || '',
      'Doc. Identidad Solicitante':   exp.solicitante_documentos         || '',
      'Representante Legal':          exp.representante_nombre           || '',
      'Doc. Identidad Representante': exp.representante_documentos       || '',
      'Lic. Funcionamiento':          exp.licencia_funcionamiento        || '',
      'ITSE':                         exp.itse                          || '',
    }))

    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Expedientes')
    XLSX.writeFile(wb, 'reporte-expedientes.xlsx')
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

      <div className="flex flex-col h-screen bg-neutral">
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
                    Reporte — Expedientes
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Consulta y exporta expedientes por distintos criterios
                  </p>
                </div>

                {/* Botones de acción — solo cuando hay resultados */}
                {buscado && !loading && expedientes.length > 0 && (
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
                      d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-700">
                    {expedientes.length}{' '}
                    {expedientes.length === 1
                      ? 'expediente encontrado'
                      : 'expedientes encontrados'}
                  </p>
                </div>

                {expedientes.length > 0 ? (
                  <TablaResultados expedientes={expedientes} />
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
    </>
  )
}
