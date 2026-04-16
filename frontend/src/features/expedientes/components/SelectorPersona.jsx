import { useRef, useCallback } from 'react'
import AsyncSelect from 'react-select/async'
import { personasApi } from '@api/personasApi'

// ── Estilos de react-select alineados al diseño del sistema ───────────────────

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#003366' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(0,51,102,0.2)' : 'none',
    borderRadius: '0.5rem',
    minHeight: '38px',
    fontSize: '14px',
    cursor: 'text',
    '&:hover': { borderColor: '#003366' },
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#003366'
      : state.isFocused
        ? '#EFF6FF'
        : 'white',
    color: state.isSelected ? 'white' : '#374151',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '8px 12px',
  }),
  placeholder: (base) => ({ ...base, fontSize: '14px', color: '#9CA3AF' }),
  singleValue: (base) => ({ ...base, fontSize: '14px', color: '#374151' }),
  menu: (base) => ({
    ...base,
    borderRadius: '0.5rem',
    border: '1px solid #E5E7EB',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    zIndex: 50,
  }),
  noOptionsMessage: (base) => ({ ...base, fontSize: '13px', color: '#6B7280' }),
  loadingMessage:   (base) => ({ ...base, fontSize: '13px', color: '#6B7280' }),
  clearIndicator:   (base) => ({ ...base, cursor: 'pointer' }),
}

// ── Formato de cada opción en el desplegable ──────────────────────────────────

const formatOptionLabel = (option) => (
  <div>
    <div className="font-medium text-sm">{option.data.persona_nombre}</div>
    {option.data.documento_concatenado && (
      <div className="text-xs text-gray-500 mt-0.5">{option.data.documento_concatenado}</div>
    )}
  </div>
)

// ── Componente ─────────────────────────────────────────────────────────────────

/**
 * Selector asíncrono de persona con debounce.
 *
 * Reutilizable en los formularios de Expediente, Licencia e ITSE.
 *
 * Props
 * -----
 * label    : string  — etiqueta del campo
 * required : bool    — si es true, muestra asterisco rojo
 * value    : option | null
 * onChange : (option | null) => void
 */
export default function SelectorPersona({ label, required = false, value, onChange }) {
  const debounceRef = useRef(null)

  const loadOptions = useCallback((inputValue, callback) => {
    clearTimeout(debounceRef.current)

    const texto = inputValue?.trim() ?? ''
    if (texto.length < 2) {
      callback([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        // Si el texto es sólo dígitos → buscar por documento, si no → por nombre
        const filtro = /^\d+$/.test(texto) ? 'DOCUMENTO' : 'NOMBRE'
        const res = await personasApi.buscar(filtro, texto)
        const options = res.data.map((p) => ({
          value: p.id,
          label: p.persona_nombre,
          data:  p,
        }))
        callback(options)
      } catch {
        callback([])
      }
    }, 400)
  }, [])

  const persona = value?.data

  return (
    <div>
      {/* Cabecera del campo */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-medium text-gray-600">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
        <button
          type="button"
          className="flex items-center gap-1 text-xs font-medium text-tertiary hover:text-tertiary/80 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo
        </button>
      </div>

      {/* Selector asíncrono */}
      <AsyncSelect
        loadOptions={loadOptions}
        value={value}
        onChange={onChange}
        isClearable
        placeholder="Busque por nombre o N° de documento..."
        noOptionsMessage={({ inputValue }) =>
          !inputValue || inputValue.trim().length < 2
            ? 'Ingrese al menos 2 caracteres'
            : 'No se encontraron resultados'
        }
        loadingMessage={() => 'Buscando...'}
        formatOptionLabel={formatOptionLabel}
        styles={selectStyles}
      />

      {/* Información de la persona seleccionada */}
      {persona && (
        <div className="mt-2 space-y-0.5 text-xs text-gray-600">
          {(persona.direccion || persona.distrito || persona.provincia || persona.departamento) && (
            <p>
              {[persona.direccion, persona.distrito, persona.provincia, persona.departamento]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          {persona.telefono && (
            <p>Teléfono: <span className="text-gray-800">{persona.telefono}</span></p>
          )}
          {persona.correo_electronico && (
            <p>Correo: <span className="text-gray-800">{persona.correo_electronico}</span></p>
          )}
        </div>
      )}
    </div>
  )
}
