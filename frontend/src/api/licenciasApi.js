import api from './axios'

export const licenciasApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/licencias-funcionamiento/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/licencias-funcionamiento/', data),
}
