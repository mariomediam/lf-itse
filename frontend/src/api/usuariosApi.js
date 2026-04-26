import api from './axios'

export const usuariosApi = {
  listar: () =>
    api.get('/api/lf-itse/usuarios/'),

  obtener: (id) =>
    api.get(`/api/lf-itse/usuarios/${id}/`),

  crear: (data) =>
    api.post('/api/lf-itse/usuarios/', data),

  actualizar: (id, data) =>
    api.put(`/api/lf-itse/usuarios/${id}/`, data),

  eliminar: (id) =>
    api.delete(`/api/lf-itse/usuarios/${id}/`),

  cambiarPassword: (id, data) =>
    api.patch(`/api/lf-itse/usuarios/${id}/cambiar-password/`, data),
}
