import api from './axios'

export const expedientesApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/expedientes/buscar/', { params: { filtro, valor } }),
}
