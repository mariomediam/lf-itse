import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { itseApi } from '@api/itseApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '-'
  const d = new Date(fechaStr)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getUTCFullYear()}`
}

const getAnio = (fechaStr) => {
  if (!fechaStr) return '-'
  return new Date(fechaStr).getUTCFullYear()
}

const formatNumeroItse = (numero, fechaExpedicion) => {
  const anio = getAnio(fechaExpedicion)
  return `${String(numero).padStart(6, '0')}-${anio}`
}

const padCiiu = (ciiu) => String(ciiu).padStart(4, '0')

// ── Sub-componentes del documento ─────────────────────────────────────────────

function SectionHeader({ title }) {
  return (
    <div className="border-t border-gray-800 px-3 py-1.5" style={{ backgroundColor: '#e5e7eb' }}>
      <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
    </div>
  )
}

function DataRow({ label, value }) {
  return (
    <div className="flex border-t border-gray-800 text-xs leading-relaxed">
      <div className="w-56 shrink-0 px-3 py-1 font-medium">{label}</div>
      <div className="flex-1 px-3 py-1 border-l border-gray-800">
        : {value !== null && value !== undefined && value !== '' ? value : '-'}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const ItseImprimirPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [itse, setItse]       = useState(null)
  const [giros, setGiros]     = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true)
        const [itseRes, girosRes] = await Promise.all([
          itseApi.buscar('ID', id),
          itseApi.getGiros(id),
        ])

        const item = itseRes.data[0]
        if (!item) {
          setError('Certificado ITSE no encontrado.')
          return
        }

        setItse(item)
        setGiros(girosRes.data)
      } catch {
        setError('Error al cargar los datos del certificado ITSE.')
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [id])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-600">Cargando certificado ITSE...</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !itse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || 'Certificado ITSE no encontrado.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* ── Barra de acciones (oculta al imprimir) ── */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver
        </button>
        <span className="text-sm text-gray-500 ml-2">
          Vista previa — ITSE N.° {formatNumeroItse(itse.numero_itse, itse.fecha_expedicion)}
        </span>
      </div>

      {/* ── Fondo de pantalla ── */}
      <div className="bg-gray-300 min-h-screen py-8">

        {/* ── Hoja A4 ── */}
        <div
          className="mx-auto bg-white shadow-2xl text-gray-900"
          style={{ width: '210mm', height: '297mm', padding: '12mm', boxSizing: 'border-box' }}
        >
          {/* Documento con borde exterior */}
          <div className="border border-gray-800 flex flex-col" style={{ height: '100%' }}>

            {/* ── ENCABEZADO ── */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-800">
              <img
                src="/images/escudo-muni.png"
                alt="Escudo Municipal"
                className="h-20 w-20 object-contain shrink-0"
                onError={(e) => { e.target.style.display = 'none' }}
              />
              <div className="flex-1 text-center">
                <p className="font-bold uppercase text-sm leading-snug">
                  Municipalidad Provincial de Lamas
                </p>
                <p className="font-bold uppercase text-xs mt-1 leading-snug">
                  Certificado de Inspección Técnica de Seguridad en Edificaciones - ITSE
                </p>
              </div>
            </div>

            {/* ── ITSE N.° + RESOLUCIÓN ── */}
            <div className="grid grid-cols-2 border-b border-gray-800">
              <div className="px-3 py-2 border-r border-gray-800">
                <p className="text-xs font-semibold">
                  ITSE N.° {formatNumeroItse(itse.numero_itse, itse.fecha_expedicion)}
                </p>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs font-semibold">
                  RESOLUCIÓN N.° {itse.resolucion_numero || '-'}
                </p>
              </div>
            </div>

            {/* ── DATOS DEL EXPEDIENTE ── */}
            <SectionHeader title="Datos del Expediente" />
            <DataRow
              label="Expediente N.°"
              value={
                itse.numero_expediente != null && itse.fecha_recepcion
                  ? `${itse.numero_expediente} - ${getAnio(itse.fecha_recepcion)}`
                  : itse.numero_expediente ?? '-'
              }
            />

            {/* ── DATOS DEL SOLICITANTE ── */}
            <SectionHeader title="Datos del Solicitante" />
            <DataRow label="Solicitante"         value={itse.conductor_nombre} />
            <DataRow label="Representante legal" value={itse.titular_nombre} />
            <DataRow label="Nombre comercial"    value={itse.nombre_comercial} />

            {/* ── DATOS DEL ESTABLECIMIENTO ── */}
            <SectionHeader title="Datos del Establecimiento" />
            <DataRow label="Dirección"      value={itse.direccion} />
            <DataRow
              label="Área"
              value={itse.area != null ? `${itse.area} m²` : '-'}
            />
            <DataRow
              label="Aforo"
              value={itse.capacidad_aforo != null ? `${itse.capacidad_aforo} personas` : '-'}
            />
            <DataRow label="Nivel de riesgo" value={itse.nivel_riesgo_nombre} />

            {/* ── GIROS INSPECCIONADOS ── */}
            <SectionHeader title="Giros Inspeccionados" />
            <div className="border-t border-gray-800 px-3 py-1 text-xs leading-relaxed">
              {giros.length > 0 ? (
                giros.map((g) => (
                  <p key={g.id}>
                    {padCiiu(g.ciiu_id)} {g.nombre}
                  </p>
                ))
              ) : (
                <p>-</p>
              )}
            </div>

            {/* ── VIGENCIA ── */}
            <SectionHeader title="Vigencia" />
            <DataRow label="Fecha de expedición"             value={formatFecha(itse.fecha_expedicion)} />
            <DataRow label="Fecha de solicitud de renovación" value={formatFecha(itse.fecha_solicitud_renovacion)} />
            <DataRow label="Fecha de caducidad"              value={formatFecha(itse.fecha_caducidad)} />

            {/* ── LEYENDA (crece para empujar la firma al fondo) ── */}
            <div className="border-t border-gray-800 px-3 py-3 flex-1">
              <p className="text-xs italic text-gray-500 mb-1">
                Observación / leyenda institucional:
              </p>
              <p className="text-xs">
                El presente certificado acredita que el establecimiento cumple con las
                condiciones de seguridad en edificaciones, conforme a la evaluación
                efectuada por la municipalidad competente.
              </p>
            </div>

            {/* ── FIRMA + QR ── */}
            <div className="border-t border-gray-800 flex" style={{ minHeight: '88px' }}>
              {/* Firma */}
              <div className="flex-1 border-r border-gray-800 px-3 pb-3 flex flex-col justify-end">
                <div className="border-t border-gray-800 pt-2 mt-12">
                  <p className="text-xs">Firma y sello</p>
                  <p className="text-xs text-gray-600">Autoridad competente</p>
                </div>
              </div>
              {/* QR placeholder */}
              <div className="w-36 p-3 flex items-center justify-center">
                <div
                  className="border-2 border-dashed border-gray-400 flex items-center justify-center"
                  style={{ width: '88px', height: '88px' }}
                >
                  <p className="text-xs text-gray-400 text-center leading-tight">
                    QR DE<br />VALIDACIÓN
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default ItseImprimirPage
