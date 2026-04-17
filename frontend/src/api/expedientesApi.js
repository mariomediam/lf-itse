import api from './axios'

export const expedientesApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/expedientes/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/expedientes/', data),

  getTiposProcedimiento: () =>
    api.get('/api/lf-itse/tipos-procedimiento-tupa/'),

  ampliarPlazo: (id, data) =>
    api.post(`/api/lf-itse/expedientes/${id}/ampliacion-plazo/`, data),

  denegarLicencia: (id, data) =>
    api.post(`/api/lf-itse/expedientes/${id}/denegar-licencia/`, data),

  denegarItse: (id, data) =>
    api.post(`/api/lf-itse/expedientes/${id}/denegar-itse/`, data),
}
