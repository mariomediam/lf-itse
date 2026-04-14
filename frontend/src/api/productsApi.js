import api from './axios'

export const productsApi = {
  getAllProducts: async () => {
    const response = await api.get('/api/products/')
    return response.data
  },
  getProductById: async (id) => {
    const response = await api.get(`/api/products/${id}/`)
    return response.data
  },
  addProduct: async (product) => {
    const response = await api.post('/api/products/', product)
    return response.data
  },
  updateProduct: async (id, product) => {
    const response = await api.put(`/api/products/${id}/`, product)
    return response.data
  },
  deleteProduct: async (id) => {
    const response = await api.delete(`/api/products/${id}/`)
    return response.data
  },
}
