import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import TopBar from '@components/layout/TopBar'
import SideMenu from '@components/layout/SideMenu'
import { dashboardApi } from '@api/dashboardApi'
import { expedientesApi } from '@api/expedientesApi'
import { personasApi } from '@api/personasApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const formatFechaHora = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  const dia  = String(d.getUTCDate()).padStart(2, '0')
  const mes  = String(d.getUTCMonth() + 1).padStart(2, '0')
  const hora = String(d.getUTCHours()).padStart(2, '0')
  const min  = String(d.getUTCMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()} ${hora}:${min}`
}

const formatNumeroExpediente = (numero, fechaRecepcion) => {
  const anio = new Date(fechaRecepcion).getFullYear()
  return `${String(numero).padStart(4, '0')}-${anio}`
}

const formatSize = (bytes) => {
  if (!bytes) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(1)} KB`
}

const getStatusText = ({ licencia_pendiente, itse_pendiente }) => {
  if (licencia_pendiente && itse_pendiente) return 'ITSE y licencia pendiente'
  if (itse_pendiente)     return 'ITSE pendiente'
  if (licencia_pendiente) return 'Licencia pendiente'
  return null
}

const esFinalizado = ({ licencia_pendiente, itse_pendiente }) =>
  !licencia_pendiente && !itse_pendiente

// ── Iconos ────────────────────────────────────────────────────────────────────

const IconoVolver = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)

const IconoArchivo = () => (
  <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const IconoDescargar = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
)

const IconoPersona = () => (
  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IconoAdjuntos = () => (
  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
)

// ── Campo genérico ────────────────────────────────────────────────────────────

function Campo({ etiqueta, valor }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{etiqueta}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{valor || '-'}</p>
    </div>
  )
}

// ── Card: Información general del expediente ──────────────────────────────────

function CardInfoExpediente({ expediente }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">

      <Campo
        etiqueta="Denominación del procedimiento"
        valor={expediente.nombre_procedimiento}
      />

      <Campo
        etiqueta="Fecha de recepción"
        valor={formatFecha(expediente.fecha_recepcion)}
      />

      {expediente.observaciones && (
        <Campo
          etiqueta="Observaciones"
          valor={expediente.observaciones}
        />
      )}

      {/* Ampliación de plazo — solo si existe */}
      {expediente.dias_ampliacion && (
        <>
          <hr className="border-gray-100" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Ampliación de plazo
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Campo etiqueta="Fecha de suspensión"            valor={formatFecha(expediente.fecha_suspension)} />
            <Campo etiqueta="Días de ampliación"             valor={expediente.dias_ampliacion} />
            <Campo etiqueta="Motivo de ampliación"           valor={expediente.motivo_ampliacion} />
            <Campo etiqueta="Fecha de digitación ampliación" valor={formatFechaHora(expediente.fecha_digitacion_ampliacion)} />
          </div>
        </>
      )}

      <hr className="border-gray-100" />
      <Campo
        etiqueta="Fecha de digitación"
        valor={formatFechaHora(expediente.fecha_digitacion)}
      />
    </div>
  )
}

// ── Card: Solicitante / Representante legal ───────────────────────────────────

function FilaPersona({ rol, persona }) {
  if (!persona) return null
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
      <span className="text-gray-500 w-36 shrink-0">{rol}:</span>
      <span className="font-medium text-primary">{persona.persona_nombre}</span>
      {persona.documento_concatenado && (
        <span className="text-gray-600">{persona.documento_concatenado}</span>
      )}
      {persona.telefono && (
        <span className="text-gray-600">Teléfono <strong className="text-gray-800">{persona.telefono}</strong></span>
      )}
      {persona.correo_electronico && (
        <span className="text-gray-600">Correo <strong className="text-gray-800">{persona.correo_electronico}</strong></span>
      )}
    </div>
  )
}

function CardSolicitante({ solicitante, representante }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconoPersona />
        <h2 className="text-sm font-semibold text-gray-800">Solicitante / Representante legal</h2>
      </div>

      <div className="space-y-3">
        <FilaPersona rol="Solicitante"        persona={solicitante} />
        <FilaPersona rol="Representante legal" persona={representante} />
      </div>
    </div>
  )
}

// ── Card: Documentos adjuntos ─────────────────────────────────────────────────

function CardDocumentosAdjuntos({ archivos, descargandoUuid, onDescargar }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconoAdjuntos />
        <h2 className="text-sm font-semibold text-gray-800">Documentos adjuntos</h2>
      </div>

      {archivos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No hay documentos adjuntos en este expediente.
        </p>
      ) : (
        <div className="space-y-2">
          {archivos.map((archivo) => (
            <div
              key={archivo.id}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <IconoArchivo />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {archivo.nombre_original}
                </p>
                <p className="text-xs text-gray-400">{formatSize(archivo.tamanio_bytes)}</p>
              </div>

              <button
                type="button"
                onClick={() => onDescargar(archivo)}
                disabled={descargandoUuid === archivo.uuid}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600
                  rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors shrink-0
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <IconoDescargar />
                {descargandoUuid === archivo.uuid ? 'Descargando...' : 'Descargar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab: Información del expediente (composición de cards) ────────────────────

function TabInfoExpediente({ expediente, solicitante, representante, archivos, descargandoUuid, onDescargar }) {
  return (
    <div className="space-y-4">
      <CardInfoExpediente expediente={expediente} />
      <CardSolicitante    solicitante={solicitante} representante={representante} />
      <CardDocumentosAdjuntos
        archivos={archivos}
        descargandoUuid={descargandoUuid}
        onDescargar={onDescargar}
      />
    </div>
  )
}

// ── Tab placeholder ───────────────────────────────────────────────────────────

function TabProximamente({ titulo }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-10 flex flex-col items-center justify-center text-center">
      <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="text-sm text-gray-400">{titulo}</p>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

const TABS = [
  { id: 'info',     label: 'Información del expediente' },
  { id: 'licencia', label: 'Licencia de funcionamiento' },
  { id: 'itse',     label: 'ITSE' },
]

export default function VerExpedientePage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [sidebarOpen,    setSidebarOpen]    = useState(true)
  const [menus,          setMenus]          = useState([])
  const [expediente,     setExpediente]     = useState(null)
  const [solicitante,    setSolicitante]    = useState(null)
  const [representante,  setRepresentante]  = useState(null)
  const [archivos,       setArchivos]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [descargandoUuid, setDescargandoUuid] = useState(null)
  const [tabActivo,      setTabActivo]      = useState('info')

  // ── Carga de datos ────────────────────────────────────────────────────────

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [menusRes, expRes] = await Promise.all([
        dashboardApi.getMenusUsuario(),
        expedientesApi.getById(id),
      ])
      setMenus(menusRes.data)

      if (!expRes.data.length) {
        toast.error('El expediente no fue encontrado')
        navigate(-1)
        return
      }

      const exp = expRes.data[0]
      setExpediente(exp)

      // Carga de personas y archivos en paralelo
      const promesas = [
        personasApi.buscar('ID', exp.solicitante_id),
        exp.representante_id
          ? personasApi.buscar('ID', exp.representante_id)
          : Promise.resolve(null),
        expedientesApi.listarArchivos(exp.id),
      ]
      const [solRes, repRes, archRes] = await Promise.all(promesas)

      setSolicitante(solRes?.data?.[0] ?? null)
      setRepresentante(repRes?.data?.[0] ?? null)
      setArchivos(archRes.data)
    } catch {
      toast.error('Error al cargar el expediente')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    cargar()
  }, [cargar])

  // ── Descarga de archivos ──────────────────────────────────────────────────

  const handleDescargar = async (archivo) => {
    setDescargandoUuid(archivo.uuid)
    try {
      const res = await expedientesApi.descargarArchivo(archivo.uuid)
      const contentType = res.headers['content-type'] || 'application/octet-stream'
      const blob = new Blob([res.data], { type: contentType })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = archivo.nombre_original
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el archivo')
    } finally {
      setDescargandoUuid(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const finalizado = expediente ? esFinalizado(expediente) : false
  const statusText = expediente ? getStatusText(expediente) : null
  const { dias_habiles_restantes, mostrar_alerta } = expediente ?? {}

  const diasLabel = dias_habiles_restantes === 1
    ? '1 día para vencer plazo'
    : `${dias_habiles_restantes} días para vencer plazo`

  return (
    <div className="flex flex-col h-screen bg-neutral">
      <TopBar onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <SideMenu menus={menus} isOpen={sidebarOpen} />

        <main className="flex-1 overflow-y-auto p-6">

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          ) : expediente && (
            <>
              {/* ── Cabecera: volver + número + badges ───────────────────── */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary
                    transition-colors mb-3"
                >
                  <IconoVolver />
                  Volver
                </button>

                <div className="flex items-center flex-wrap gap-2">
                  <h1 className="text-xl font-bold text-primary">
                    Expediente {formatNumeroExpediente(expediente.numero_expediente, expediente.fecha_recepcion)}
                  </h1>

                  {finalizado ? (
                    <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-success text-white">
                      Finalizado
                    </span>
                  ) : (
                    <>
                      <span className={[
                        'px-3 py-0.5 rounded-full text-xs font-semibold',
                        mostrar_alerta
                          ? 'bg-danger text-white'
                          : 'border border-gray-400 text-gray-700',
                      ].join(' ')}>
                        {diasLabel}
                      </span>

                      {statusText && (
                        <span className="px-3 py-0.5 rounded-full text-xs font-medium border border-gray-400 text-gray-700">
                          {statusText}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── Tabs ─────────────────────────────────────────────────── */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTabActivo(tab.id)}
                      className={[
                        'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                        tabActivo === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* ── Contenido ────────────────────────────────────────────── */}
              {tabActivo === 'info' && (
                <TabInfoExpediente
                  expediente={expediente}
                  solicitante={solicitante}
                  representante={representante}
                  archivos={archivos}
                  descargandoUuid={descargandoUuid}
                  onDescargar={handleDescargar}
                />
              )}
              {tabActivo === 'licencia' && (
                <TabProximamente titulo="Información de la licencia de funcionamiento" />
              )}
              {tabActivo === 'itse' && (
                <TabProximamente titulo="Información del certificado ITSE" />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
