import { useRef, useCallback, useState, useMemo } from 'react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'flowbite-react'
import AsyncSelect from 'react-select/async'
import { licenciasApi } from '@api/licenciasApi'

// ── Estilos del react-select ──────────────────────────────────────────────────

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
    backgroundColor: state.isSelected ? '#003366' : state.isFocused ? '#EFF6FF' : 'white',
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
    zIndex: 10,
  }),
  noOptionsMessage: (base) => ({ ...base, fontSize: '13px', color: '#6B7280' }),
  loadingMessage:   (base) => ({ ...base, fontSize: '13px', color: '#6B7280' }),
}

const formatOptionLabel = (option) => (
  <div>
    <span className="font-medium text-sm">
      {option.data.ciiu_id ? `${option.data.ciiu_id}  ` : ''}
      {option.data.nombre}
    </span>
  </div>
)

/**
 * Modal para buscar y seleccionar un giro y agregarlo a la licencia.
 *
 * Props
 * -----
 * isOpen        : bool
 * onClose       : () => void
 * girosYaAgregados : number[]  — ids de giros ya en la lista (para evitar duplicados)
 * onAgregarGiro : (giro: object) => void
 */
export default function AgregarGiroModal({ isOpen, onClose, girosYaAgregados = [], onAgregarGiro }) {
  const [giroSeleccionado, setGiroSeleccionado] = useState(null)
  const debounceRef = useRef(null)

  /* loadOptions devuelve una Promise que solo se resuelve tras 450 ms sin
     nuevas pulsaciones. Así react-select no muestra el spinner ni dispara
     la búsqueda hasta que el usuario ha dejado de escribir. */
  const loadOptions = useMemo(() => {
    const fn = (inputValue) =>
      new Promise((resolve) => {
        clearTimeout(debounceRef.current)
        const texto = inputValue?.trim() ?? ''
        if (texto.length < 1) {
          resolve([])
          return
        }
        debounceRef.current = setTimeout(async () => {
          try {
            const res = await licenciasApi.buscarGiros(texto)
            const options = res.data
              .filter((g) => !girosYaAgregados.includes(g.id))
              .map((g) => ({
                value: g.id,
                label: g.ciiu_id ? `${g.ciiu_id} - ${g.nombre}` : g.nombre,
                data: g,
              }))
            resolve(options)
          } catch {
            resolve([])
          }
        }, 450)
      })
    return fn
  }, [girosYaAgregados])

  const handleClose = () => {
    setGiroSeleccionado(null)
    onClose()
  }

  const handleAgregar = () => {
    if (!giroSeleccionado) return
    onAgregarGiro(giroSeleccionado.data)
    setGiroSeleccionado(null)
    onClose()
  }

  return (
    <Modal show={isOpen} size="md" onClose={handleClose}>

      <ModalHeader className="bg-white border-b border-gray-200">
        <div className="flex items-center gap-2.5">
          <span className="text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </span>
          <span className="text-base font-semibold text-gray-800">Agregar giros</span>
        </div>
      </ModalHeader>

      <ModalBody className="bg-white px-6 pt-6 pb-0" style={{ minHeight: '320px' }}>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Seleccionar giros
          </label>
          <AsyncSelect
            loadOptions={loadOptions}
            value={giroSeleccionado}
            onChange={setGiroSeleccionado}
            isClearable
            placeholder="Busque por código CIIU o nombre..."
            noOptionsMessage={({ inputValue }) =>
              !inputValue || inputValue.trim().length < 1
                ? 'Ingrese al menos 1 caracter'
                : 'No se encontraron giros'
            }
            loadingMessage={() => 'Buscando...'}
            formatOptionLabel={formatOptionLabel}
            styles={selectStyles}
          />
        </div>
      </ModalBody>

      <ModalFooter className="border-t-0 bg-white flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={handleClose}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600
            rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleAgregar}
          disabled={!giroSeleccionado}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-white
            rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar giro
        </button>
      </ModalFooter>

    </Modal>
  )
}
