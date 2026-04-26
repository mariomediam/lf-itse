import api from './axios'

export const zonificacionesApi = {
  listar: (params = {}) =>
    api.get('/api/lf-itse/zonificaciones/', { params }),

  obtener: (id) =>
    api.get(`/api/lf-itse/zonificaciones/${id}/`),

  crear: (data) =>
    api.post('/api/lf-itse/zonificaciones/', data),

  actualizar: (id, data) =>
    api.put(`/api/lf-itse/zonificaciones/${id}/`, data),

  eliminar: (id) =>
    api.delete(`/api/lf-itse/zonificaciones/${id}/`),
}
