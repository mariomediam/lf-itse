import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { licenciasApi } from '@api/licenciasApi'
import { personasApi } from '@api/personasApi'

// ── Constantes ────────────────────────────────────────────────────────────────

const CODIGO_DNI = '01'
const CODIGO_CE  = '04'

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

const formatHora = (hora) => {
  if (hora === undefined || hora === null) return '-'
  const h = parseInt(hora, 10)
  const periodo = h < 12 ? 'A.M.' : 'P.M.'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:00 ${periodo}`
}

const formatNumeroLicencia = (numero, fechaEmision) => {
  const anio = getAnio(fechaEmision)
  return `${String(numero).padStart(6, '0')}-${anio}`
}

const formatVigencia = (licencia) => {
  if (!licencia) return '-'
  if (licencia.es_vigencia_indeterminada) return 'INDEFINIDA'
  return `${formatFecha(licencia.fecha_inicio_vigencia)} - ${formatFecha(licencia.fecha_fin_vigencia)}`
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
      <div className="w-44 shrink-0 px-3 py-1 font-medium">{label}</div>
      <div className="flex-1 px-3 py-1 border-l border-gray-800">
        : {value !== null && value !== undefined && value !== '' ? value : '-'}
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

const LicenciaImprimirPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [licencia, setLicencia]       = useState(null)
  const [giros, setGiros]             = useState([])
  const [docIdentidad, setDocIdentidad] = useState(null)
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true)
        const [licRes, girosRes] = await Promise.all([
          licenciasApi.buscar('ID', id),
          licenciasApi.getGiros(id),
        ])

        const lic = licRes.data[0]
        if (!lic) {
          setError('Licencia no encontrada.')
          return
        }

        setLicencia(lic)
        setGiros(girosRes.data)

        if (lic.conductor_id) {
          try {
            const docRes = await personasApi.getDocumentos(lic.conductor_id)
            const docs   = docRes.data
            const docDni = docs.find((d) => d.tipos_documento_identidad_codigo === CODIGO_DNI)
            const docCe  = docs.find((d) => d.tipos_documento_identidad_codigo === CODIGO_CE)
            setDocIdentidad(docDni || docCe || null)
          } catch {
            // Continuamos sin documento de identidad del representante
          }
        }
      } catch {
        setError('Error al cargar los datos de la licencia.')
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
          <p className="mt-3 text-sm text-gray-600">Cargando licencia...</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !licencia) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || 'Licencia no encontrada.'}</p>
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
          Vista previa — Licencia N.° {formatNumeroLicencia(licencia.numero_licencia, licencia.fecha_emision)}
        </span>
      </div>

      {/* ── Fondo de pantalla ── */}
      <div className="bg-gray-300 min-h-screen py-8">

        {/* ── Hoja A4 ── */}
        <div
          className="mx-auto bg-white shadow-2xl text-gray-900"
          style={{ width: '210mm', minHeight: '297mm', padding: '12mm' }}
        >
          {/* Documento con borde exterior */}
          <div className="border border-gray-800 h-full flex flex-col">

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
                  Municipalidad Distrital de Valle Dorado
                </p>
                <p className="font-bold uppercase text-base mt-1 tracking-widest">
                  Licencia de Funcionamiento
                </p>
              </div>
            </div>

            {/* ── N.° LICENCIA + RESOLUCIÓN ── */}
            <div className="grid grid-cols-2 border-b border-gray-800">
              <div className="px-3 py-2 border-r border-gray-800">
                <p className="text-xs font-semibold">
                  LICENCIA N.° {formatNumeroLicencia(licencia.numero_licencia, licencia.fecha_emision)}
                </p>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs font-semibold">
                  RESOLUCIÓN N.° {licencia.resolucion_numero || '-'}
                </p>
              </div>
            </div>

            {/* ── FECHA EMISIÓN + VIGENCIA ── */}
            <div className="grid grid-cols-2 border-b border-gray-800">
              <div className="px-3 py-2 border-r border-gray-800">
                <p className="text-xs">
                  FECHA DE EMISIÓN:{' '}
                  <strong>{formatFecha(licencia.fecha_emision)}</strong>
                </p>
              </div>
              <div className="px-3 py-2">
                <p className="text-xs">
                  VIGENCIA:{' '}
                  <strong>{formatVigencia(licencia)}</strong>
                </p>
              </div>
            </div>

            {/* ── DATOS DEL EXPEDIENTE ── */}
            <SectionHeader title="Datos del Expediente" />
            <DataRow label="N.° Expediente"     value={licencia.numero_expediente} />
            <DataRow label="Año expediente"     value={getAnio(licencia.fecha_recepcion)} />
            <DataRow label="Fecha de solicitud" value={formatFecha(licencia.fecha_recepcion)} />

            {/* ── DATOS DEL TITULAR ── */}
            <SectionHeader title="Datos del Titular" />
            <DataRow label="Titular"            value={licencia.titular_nombre} />
            <DataRow label="RUC"                value={licencia.titular_ruc} />
            <DataRow label="Representante legal" value={licencia.conductor_nombre} />
            <DataRow
              label={docIdentidad?.tipos_documento_identidad_nombre || 'DNI / CE'}
              value={docIdentidad?.numero_documento || '-'}
            />

            {/* ── DATOS DEL ESTABLECIMIENTO ── */}
            <SectionHeader title="Datos del Establecimiento" />
            <DataRow label="Nombre comercial" value={licencia.nombre_comercial} />
            <DataRow label="Dirección"        value={licencia.direccion} />
            <DataRow label="Zonificación"     value={licencia.zonificacion_nombre} />
            <DataRow
              label="Área"
              value={licencia.area != null ? `${licencia.area} m²` : '-'}
            />
            <DataRow
              label="Horario"
              value={`${formatHora(licencia.hora_desde)} - ${formatHora(licencia.hora_hasta)}`}
            />
            <DataRow label="Nivel de riesgo" value={licencia.nivel_riesgo_nombre} />

            {/* ── ACTIVIDAD AUTORIZADA ── */}
            <SectionHeader title="Actividad Autorizada" />
            <DataRow label="Actividad económica" value={licencia.actividad} />

            {/* Giros */}
            <div className="border-t border-gray-800 text-xs leading-relaxed">
              <div className="flex">
                <div className="w-44 shrink-0 px-3 py-1 font-medium">Giro(s)</div>
                <div className="flex-1 border-l border-gray-800 px-3 py-1">
                  {giros.length > 0 ? (
                    giros.map((g) => (
                      <p key={g.id}>
                        : {padCiiu(g.ciiu_id)} {g.nombre}
                      </p>
                    ))
                  ) : (
                    <p>: -</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── OBSERVACIONES / LEYENDA ── */}
            <div className="border-t border-gray-800 px-3 py-3 flex-1">
              <p className="text-xs italic text-gray-500 mb-1">
                Observación / leyenda institucional:
              </p>
              <p className="text-xs">
                La presente licencia autoriza el funcionamiento del establecimiento conforme
                a la información declarada y aprobada por la Municipalidad.
              </p>
              {licencia.observaciones && (
                <p className="text-xs mt-2 italic text-gray-700">
                  {licencia.observaciones}
                </p>
              )}
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

export default LicenciaImprimirPage
