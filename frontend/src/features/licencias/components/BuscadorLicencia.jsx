import { useState } from 'react'

const FILTROS = [
  { valor: 'NUMERO',            etiqueta: 'Número de licencia' },
  { valor: 'EXPEDIENTE',        etiqueta: 'Número de expediente' },
  { valor: 'NOMBRE_COMERCIAL',  etiqueta: 'Nombre comercial' },
  { valor: 'FECHA_EMISION',     etiqueta: 'Fecha de emisión' },
  { valor: 'NOMBRES_TITULAR',   etiqueta: 'Nombres del titular' },
  { valor: 'RUC_TITULAR',       etiqueta: 'RUC del titular' },
  { valor: 'NOMBRES_CONDUCTOR', etiqueta: 'Nombres del conductor' },
  { valor: 'DIRECCION',         etiqueta: 'Dirección del establecimiento' },
  { valor: 'RECIBO_PAGO',       etiqueta: 'Número de recibo de pago' },
  { valor: 'RESOLUCION_NUMERO', etiqueta: 'Número de resolución' },
]

const FILTROS_VISIBLES = new Set(FILTROS.map((f) => f.valor))

const INPUT_TYPE = {
  NUMERO:            'number',
  EXPEDIENTE:        'number',
  NOMBRE_COMERCIAL:  'text',
  FECHA_EMISION:     'date',
  NOMBRES_TITULAR:   'text',
  RUC_TITULAR:       'text',
  NOMBRES_CONDUCTOR: 'text',
  DIRECCION:         'text',
  RECIBO_PAGO:       'text',
  RESOLUCION_NUMERO: 'text',
}

/**
 * Formulario de búsqueda de licencias de funcionamiento.
 *
 * Props
 * -----
 * onBuscar      : (filtro: string, valor: string) => void
 * loading       : boolean
 * initialFiltro : string | undefined
 * initialValor  : string | undefined
 */
export default function BuscadorLicencia({ onBuscar, loading, initialFiltro, initialValor }) {
  const filtroInicial = (initialFiltro && FILTROS_VISIBLES.has(initialFiltro))
    ? initialFiltro
    : 'NOMBRES_TITULAR'
  const valorInicial = filtroInicial === initialFiltro ? (initialValor ?? '') : ''

  const [filtro, setFiltro] = useState(filtroInicial)
  const [valor,  setValor]  = useState(valorInicial)

  const handleFiltroChange = (e) => {
    setFiltro(e.target.value)
    setValor('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const v = INPUT_TYPE[filtro] === 'date' ? valor : valor.trim()
    if (!v) return
    onBuscar(filtro, v)
  }

  const inputClass =
    'flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
      >
        <label className="text-sm font-medium text-gray-600 shrink-0">
          Buscar por
        </label>

        {/* Selector de filtro */}
        <select
          value={filtro}
          onChange={handleFiltroChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                     sm:w-64 shrink-0"
        >
          {FILTROS.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.etiqueta}
            </option>
          ))}
        </select>

        {/* Campo de valor — el tipo cambia según el filtro */}
        <input
          key={filtro}
          type={INPUT_TYPE[filtro]}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ingrese el valor a buscar..."
          className={inputClass}
        />

        {/* Botón buscar */}
        <button
          type="submit"
          disabled={loading || !valor}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white
                     text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors
                     disabled:opacity-50 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Buscar
        </button>
      </form>
    </div>
  )
}
