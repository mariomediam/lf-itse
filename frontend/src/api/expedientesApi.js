import api from './axios'

export const expedientesApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/expedientes/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/expedientes/', data),

  getTiposProcedimiento: () =>
    api.get('/api/lf-itse/tipos-procedimiento-tupa/'),
}
