import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import SelectorPersona from '../components/SelectorPersona'
import { dashboardApi } from '@api/dashboardApi'
import { expedientesApi } from '@api/expedientesApi'
import useExpedientesStore from '@store/expedientesStore'
import { personasApi } from '@api/personasApi'

// ── Clases reutilizables ──────────────────────────────────────────────────────

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary ' +
  'disabled:bg-gray-50 disabled:text-gray-400 placeholder:text-gray-400'

// ── Sección card del formulario ───────────────────────────────────────────────

function SeccionCard({ icono, titulo, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-primary">{icono}</span>
        <h2 className="text-sm font-semibold text-gray-800">{titulo}</h2>
      </div>
      {children}
    </div>
  )
}

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoDocumento = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const IconoPersonas = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const IconoTexto = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h10" />
  </svg>
)

// ── Convierte "2026-04-16T05:00:00Z" → "2026-04-16" para el input type=date ──

const isoAFechaLocal = (isoStr) => {
  if (!isoStr) return ''
  return isoStr.split('T')[0]
}

// ── Construye la opción para react-select a partir de la respuesta de personas/buscar ──

const buildPersonaOption = (persona) => ({
  value: persona.id,
  label: persona.persona_nombre,
  data:  persona,
})

// ── Página ────────────────────────────────────────────────────────────────────

export default function ModificarExpedientePage() {
  const navigate     = useNavigate()
  const { id }       = useParams()
  const { setBusqueda } = useExpedientesStore()

  // Layout
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menus,       setMenus]       = useState([])

  // Catálogo de tipos de procedimiento
  const [tipos,        setTipos]        = useState([])
  const [loadingTipos, setLoadingTipos] = useState(true)

  // Estado de carga del expediente
  const [loadingExpediente, setLoadingExpediente] = useState(true)

  // Estado del formulario
  const [tipoProcedimientoId, setTipoProcedimientoId] = useState('')
  const [numeroExpediente,    setNumeroExpediente]    = useState('')
  const [fechaRecepcion,      setFechaRecepcion]      = useState('')
  const [titular,             setTitular]             = useState(null)
  const [representante,       setRepresentante]       = useState(null)
  const [observaciones,       setObservaciones]       = useState('')
  const [submitting,          setSubmitting]          = useState(false)

  // ── Carga del menú ──────────────────────────────────────────────────────────
  useEffect(() => {
    dashboardApi.getMenusUsuario()
      .then((res) => setMenus(res.data))
      .catch(() => toast.error('Error al cargar el menú'))
  }, [])

  // ── Carga catálogo de tipos ─────────────────────────────────────────────────
  useEffect(() => {
    setLoadingTipos(true)
    expedientesApi.getTiposProcedimiento({ soloActivos: true })
      .then((res) => setTipos(res.data))
      .catch(() => toast.error('Error al cargar los tipos de procedimiento'))
      .finally(() => setLoadingTipos(false))
  }, [])

  // ── Carga del expediente + personas ────────────────────────────────────────
  useEffect(() => {
    if (!id) return

    const cargarExpediente = async () => {
      setLoadingExpediente(true)
      try {
        const resExp = await expedientesApi.buscar('ID', id)
        const exp    = resExp.data[0]
        if (!exp) {
          toast.error('No se encontró el expediente')
          navigate('/expedientes')
          return
        }

        setTipoProcedimientoId(String(exp.tipo_procedimiento_tupa_id))
        setNumeroExpediente(String(exp.numero_expediente))
        setFechaRecepcion(isoAFechaLocal(exp.fecha_recepcion))
        setObservaciones(exp.observaciones ?? '')

        // Cargar titular
        const resTitular = await personasApi.buscar('ID', exp.solicitante_id)
        if (resTitular.data[0]) setTitular(buildPersonaOption(resTitular.data[0]))

        // Cargar representante si existe
        if (exp.representante_id) {
          const resRep = await personasApi.buscar('ID', exp.representante_id)
          if (resRep.data[0]) setRepresentante(buildPersonaOption(resRep.data[0]))
        }
      } catch {
        toast.error('Error al cargar los datos del expediente')
      } finally {
        setLoadingExpediente(false)
      }
    }

    cargarExpediente()
  }, [id, navigate])

  // ── Envío del formulario ────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!tipoProcedimientoId) {
      toast.error('Seleccione la denominación del procedimiento')
      return
    }
    if (!numeroExpediente) {
      toast.error('Ingrese el número de expediente')
      return
    }
    if (!fechaRecepcion) {
      toast.error('Ingrese la fecha de recepción')
      return
    }
    if (!titular) {
      toast.error('Seleccione el titular de la licencia')
      return
    }

    const payload = {
      tipo_procedimiento_tupa_id: Number(tipoProcedimientoId),
      numero_expediente:          Number(numeroExpediente),
      fecha_recepcion:            fechaRecepcion,
      solicitante_id:             titular.data.id,
      representante_id:           representante ? representante.data.id : null,
      observaciones:              observaciones.trim() || null,
    }

    setSubmitting(true)
    try {
      await expedientesApi.actualizar(id, payload)
      setBusqueda('ID', String(id))
      toast.success('Expediente modificado correctamente')
      navigate('/expedientes')
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al modificar el expediente'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">

          {/* Enlace de regreso */}
          <button
            type="button"
            onClick={() => navigate('/expedientes')}
            className="flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al listado
          </button>

          {/* Título */}
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Modificar expediente
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Actualizar información del expediente
          </p>

          {loadingExpediente ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">

              {/* ── Datos principales ─────────────────────────────────── */}
              <SeccionCard icono={IconoDocumento} titulo="Datos principales">
                <div className="space-y-4">

                  {/* Denominación del procedimiento */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Denominación del procedimiento{' '}
                      <span className="text-danger">*</span>
                    </label>
                    <select
                      value={tipoProcedimientoId}
                      onChange={(e) => setTipoProcedimientoId(e.target.value)}
                      disabled={loadingTipos}
                      className={inputClass}
                    >
                      <option value="">
                        {loadingTipos ? 'Cargando...' : 'Seleccione un procedimiento'}
                      </option>
                      {tipos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Número de expediente + Fecha de recepción */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Número de expediente <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        value={numeroExpediente}
                        onChange={(e) => setNumeroExpediente(e.target.value)}
                        min="1"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Fecha de recepción <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        value={fechaRecepcion}
                        onChange={(e) => setFechaRecepcion(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </SeccionCard>

              {/* ── Titular y representante ──────────────────────────── */}
              <SeccionCard icono={IconoPersonas} titulo="Datos del titular y representante legal">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SelectorPersona
                    label="Titular de la licencia"
                    required
                    value={titular}
                    onChange={setTitular}
                  />
                  <SelectorPersona
                    label="Representante legal"
                    value={representante}
                    onChange={setRepresentante}
                  />
                </div>
              </SeccionCard>

              {/* ── Observaciones ────────────────────────────────────── */}
              <SeccionCard icono={IconoTexto} titulo="Observaciones">
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  placeholder="Ingrese observaciones (opcional)..."
                  className={`${inputClass} resize-y`}
                />
              </SeccionCard>

              {/* ── Botones ──────────────────────────────────────────── */}
              <div className="flex justify-end gap-3 pb-4">
                <button
                  type="button"
                  onClick={() => navigate('/expedientes')}
                  className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 rounded-lg
                             text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg
                             text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  Modificar expediente
                </button>
              </div>

            </form>
          )}
        </main>
      </div>
    </div>
  )
}
