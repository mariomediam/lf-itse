import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de licencias
 * de funcionamiento.
 *
 * Permite que al navegar a otra página y regresar, la lista y los filtros se
 * restauren automáticamente.
 *
 * busqueda : { filtro: string, valor: string } | null
 */
const useLicenciasStore = create((set) => ({
  busqueda: null,
  setBusqueda: (filtro, valor) => set({ busqueda: { filtro, valor } }),
}))

export default useLicenciasStore
