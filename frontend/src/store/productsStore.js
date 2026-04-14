import { create } from 'zustand'
import { toast } from 'sonner'
import { productsApi } from '@api/productsApi'

const useProductsStore = create((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null })
    try {
      const data = await productsApi.getAllProducts()
      set({ products: data, loading: false })
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al cargar los productos'
      set({ loading: false, error: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  getProductById: async (id) => {
    set({ loading: true, error: null })
    try {
      const data = await productsApi.getProductById(id)
      set({ loading: false })
      return { success: true, data }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al cargar el producto'
      set({ loading: false, error: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  addProduct: async (product) => {
    set({ loading: true, error: null })
    try {
      const newProduct = await productsApi.addProduct(product)
      set((state) => ({
        products: [...state.products, newProduct],
        loading: false
      }))
      toast.success('Producto creado exitosamente')
      return { success: true, data: newProduct }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al crear el producto'
      set({ loading: false, error: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  updateProduct: async (id, product) => {
    set({ loading: true, error: null })
    try {
      const updatedProduct = await productsApi.updateProduct(id, product)
      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? updatedProduct : p
        ),
        loading: false
      }))
      toast.success('Producto actualizado exitosamente')
      return { success: true, data: updatedProduct }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al actualizar el producto'
      set({ loading: false, error: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  deleteProduct: async (id) => {
    try {
      await productsApi.deleteProduct(id)
      set((state) => ({
        products: state.products.filter((p) => p.id !== id)
      }))
      toast.success('Producto eliminado exitosamente')
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al eliminar el producto'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  },

  clearError: () => set({ error: null })
}))

export default useProductsStore
