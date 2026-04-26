import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de
 * tipos de procedimiento TUPA.
 *
 * params : { texto: string, esta_activo: string } | null
 */
const useTiposTupaStore = create((set) => ({
  params: null,
  setParams: (params) => set({ params }),
}))

export default useTiposTupaStore
