import { useState } from 'react'

const FILTROS = [
  { valor: 'NUMERO',             etiqueta: 'Número' },
  { valor: 'FECHA_RECEPCION',    etiqueta: 'Fecha de recepción' },
  { valor: 'FECHA_VENCIMIENTO',  etiqueta: 'Fecha de vencimiento' },
  { valor: 'NOMBRE_SOLICITANTE', etiqueta: 'Nombre / Razón social del solicitante' },
  { valor: 'RUC_SOLICITANTE',    etiqueta: 'RUC del solicitante' },
]

const INPUT_TYPE = {
  NUMERO:             'number',
  FECHA_RECEPCION:    'date',
  FECHA_VENCIMIENTO:  'date',
  NOMBRE_SOLICITANTE: 'text',
  RUC_SOLICITANTE:    'text',
}

/**
 * Formulario de búsqueda de expedientes.
 *
 * Props
 * -----
 * onBuscar  : (filtro: string, valor: string) => void
 * loading   : boolean
 */
export default function BuscadorExpediente({ onBuscar, loading }) {
  const [filtro, setFiltro] = useState('NOMBRE_SOLICITANTE')
  const [valor,  setValor]  = useState('')

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

        {/* Campo de valor */}
        <input
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
