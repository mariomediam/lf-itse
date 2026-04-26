import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de zonificaciones.
 *
 * params : { texto: string, esta_activo: string } | null
 */
const useZonificacionesStore = create((set) => ({
  params: null,
  setParams: (params) => set({ params }),
}))

export default useZonificacionesStore
