import { useState } from 'react'

/**
 * Buscador de usuarios por texto (nombre de usuario, nombre o apellido).
 * Realiza filtrado en el cliente sobre la lista completa ya cargada.
 *
 * Props
 * -----
 * onBuscar   : (texto: string) => void
 * loading    : boolean
 * initialTexto : string | undefined
 */
export default function BuscadorUsuario({ onBuscar, loading, initialTexto = '' }) {
  const [texto, setTexto] = useState(initialTexto)

  const handleSubmit = (e) => {
    e.preventDefault()
    onBuscar(texto.trim())
  }

  const handleLimpiar = () => {
    setTexto('')
    onBuscar('')
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
          Buscar usuario
        </label>

        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nombre de usuario, nombre o apellido..."
          className={inputClass}
        />

        <button
          type="submit"
          disabled={loading}
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

        {texto && (
          <button
            type="button"
            onClick={handleLimpiar}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300
                       text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50
                       transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        )}
      </form>
    </div>
  )
}
