import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de giros.
 *
 * busqueda : { busqueda: string, esta_activo: string } | null
 */
const useGirosStore = create((set) => ({
  busqueda: null,
  setBusqueda: (params) => set({ busqueda: params }),
}))

export default useGirosStore
