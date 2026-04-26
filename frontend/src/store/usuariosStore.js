import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de usuarios.
 *
 * busqueda : { texto: string } | null
 */
const useUsuariosStore = create((set) => ({
  busqueda: null,
  setBusqueda: (texto) => set({ busqueda: { texto } }),
}))

export default useUsuariosStore
