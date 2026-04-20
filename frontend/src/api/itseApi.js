import api from './axios'

export const itseApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/itse/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/itse/', data),

  modificar: (id, data) =>
    api.put(`/api/lf-itse/itse/${id}/`, data),

  registrarNotificacion: (id, data) =>
    api.patch(`/api/lf-itse/itse/${id}/notificacion/`, data),

  getGiros: (itseId) =>
    api.get(`/api/lf-itse/itse/${itseId}/giros/`),

  verificarExpediente: (numero_expediente, anio) =>
    api.get('/api/lf-itse/itse/verificar-expediente/', {
      params: { numero_expediente, anio },
    }),

  getNivelesRiesgo: () =>
    api.get('/api/lf-itse/niveles-riesgo/', { params: { esta_activo: 'true' } }),

  buscarGiros: (busqueda) =>
    api.get('/api/lf-itse/giros/buscar/', { params: { busqueda, esta_activo: 'true' } }),

  getEstadosInactivosItse: () =>
    api.get('/api/lf-itse/estados/inactivos-itse/'),

  inactivarItse: (data) =>
    api.post('/api/lf-itse/itse/inactivar/', data),
}
