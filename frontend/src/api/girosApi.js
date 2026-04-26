import api from './axios'

export const girosApi = {
  buscar: (params = {}) =>
    api.get('/api/lf-itse/giros/buscar/', { params }),

  listar: () =>
    api.get('/api/lf-itse/giros/'),

  obtener: (id) =>
    api.get(`/api/lf-itse/giros/${id}/`),

  crear: (data) =>
    api.post('/api/lf-itse/giros/', data),

  actualizar: (id, data) =>
    api.put(`/api/lf-itse/giros/${id}/`, data),

  eliminar: (id) =>
    api.delete(`/api/lf-itse/giros/${id}/`),
}
