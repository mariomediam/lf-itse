import api from './axios'

export const tiposProcedimientoTupaApi = {
  listar: () =>
    api.get('/api/lf-itse/tipos-procedimiento-tupa/'),

  obtener: (id) =>
    api.get(`/api/lf-itse/tipos-procedimiento-tupa/${id}/`),

  crear: (data) =>
    api.post('/api/lf-itse/tipos-procedimiento-tupa/', data),

  actualizar: (id, data) =>
    api.put(`/api/lf-itse/tipos-procedimiento-tupa/${id}/`, data),

  eliminar: (id) =>
    api.delete(`/api/lf-itse/tipos-procedimiento-tupa/${id}/`),
}
