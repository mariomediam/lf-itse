import api from './axios'

export const personasApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/personas/buscar/', { params: { filtro, valor } }),
}
