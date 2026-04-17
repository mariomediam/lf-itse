import api from './axios'

export const expedientesApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/expedientes/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/expedientes/', data),

  actualizar: (id, data) =>
    api.put(`/api/lf-itse/expedientes/${id}/`, data),

  eliminar: (id) =>
    api.delete(`/api/lf-itse/expedientes/${id}/`),

  getTiposProcedimiento: () =>
    api.get('/api/lf-itse/tipos-procedimiento-tupa/'),

  ampliarPlazo: (id, data) =>
    api.post(`/api/lf-itse/expedientes/${id}/ampliacion-plazo/`, data),

  denegarLicencia: (id, data) =>
    api.post(`/api/lf-itse/expedientes/${id}/denegar-licencia/`, data),

  denegarItse: (id, data) =>
    api.post(`/api/lf-itse/expedientes/${id}/denegar-itse/`, data),

  listarArchivos: (id) =>
    api.get(`/api/lf-itse/expedientes/${id}/archivos/`),

  subirArchivo: (id, formData) =>
    api.post(`/api/lf-itse/expedientes/${id}/archivos/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  eliminarArchivo: (archivoId) =>
    api.delete(`/api/lf-itse/expedientes/archivos/${archivoId}/`),

  descargarArchivo: (uuid) =>
    api.get(`/api/lf-itse/expedientes/archivos/${uuid}/descargar/`, {
      responseType: 'blob',
    }),
}
