import { create } from 'zustand'

/**
 * Store global para persistir el estado de búsqueda de la página de expedientes.
 *
 * Permite que al navegar a otra página (crear, modificar, ver) y regresar,
 * la lista y los filtros se restauren automáticamente.
 *
 * busqueda : { filtro: string, valor: string } | null
 *   - Se actualiza cada vez que el usuario ejecuta una búsqueda manual.
 *   - Al crear/modificar un expediente se establece con filtro='ID' y el id
 *     del expediente, de modo que al regresar se muestre ese expediente.
 */
const useExpedientesStore = create((set) => ({
  busqueda: null,
  setBusqueda: (filtro, valor) => set({ busqueda: { filtro, valor } }),
}))

export default useExpedientesStore
