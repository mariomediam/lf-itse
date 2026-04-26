import { useState } from 'react'

const FILTROS = [
  { valor: 'NOMBRE',    etiqueta: 'Nombre / Razón social' },
  { valor: 'DOCUMENTO', etiqueta: 'Número de documento' },
]

const FILTROS_VISIBLES = new Set(FILTROS.map((f) => f.valor))

/**
 * Formulario de búsqueda de personas.
 *
 * Props
 * -----
 * onBuscar      : (filtro: string, valor: string) => void
 * loading       : boolean
 * initialFiltro : string | undefined
 * initialValor  : string | undefined
 */
export default function BuscadorPersona({ onBuscar, loading, initialFiltro, initialValor }) {
  const filtroInicial = (initialFiltro && FILTROS_VISIBLES.has(initialFiltro))
    ? initialFiltro
    : 'NOMBRE'
  const valorInicial = filtroInicial === initialFiltro ? (initialValor ?? '') : ''

  const [filtro, setFiltro] = useState(filtroInicial)
  const [valor,  setValor]  = useState(valorInicial)

  const handleFiltroChange = (e) => {
    setFiltro(e.target.value)
    setValor('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!valor.trim()) return
    onBuscar(filtro, valor.trim())
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

        <select
          value={filtro}
          onChange={handleFiltroChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                     sm:w-56 shrink-0"
        >
          {FILTROS.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.etiqueta}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ingrese el valor a buscar..."
          className={inputClass}
        />

        <button
          type="submit"
          disabled={loading || !valor.trim()}
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
