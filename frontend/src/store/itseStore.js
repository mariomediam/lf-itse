import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de ITSE.
 *
 * Permite que al navegar a otra página y regresar, la lista y los filtros se
 * restauren automáticamente.
 *
 * busqueda : { filtro: string, valor: string } | null
 */
const useItseStore = create((set) => ({
  busqueda: null,
  setBusqueda: (filtro, valor) => set({ busqueda: { filtro, valor } }),
}))

export default useItseStore
