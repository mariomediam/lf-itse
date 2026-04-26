import api from './axios'

export const unidadesOrganicasApi = {
  listar: (params = {}) =>
    api.get('/api/lf-itse/unidades-organicas/', { params }),
}
