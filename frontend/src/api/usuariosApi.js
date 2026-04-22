import api from './axios'

export const usuariosApi = {
  getById: (id) =>
    api.get(`/api/lf-itse/usuarios/${id}/`),
}
