import api from './axios'

export const licenciasApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/licencias-funcionamiento/buscar/', { params: { filtro, valor } }),

  crear: (data) =>
    api.post('/api/lf-itse/licencias-funcionamiento/', data),

  modificar: (id, data) =>
    api.put(`/api/lf-itse/licencias-funcionamiento/${id}/`, data),

  registrarNotificacion: (id, data) =>
    api.patch(`/api/lf-itse/licencias-funcionamiento/${id}/notificacion/`, data),

  getGiros: (licenciaId) =>
    api.get(`/api/lf-itse/licencias-funcionamiento/${licenciaId}/giros/`),

  verificarExpediente: (numero_expediente, anio) =>
    api.get('/api/lf-itse/licencias-funcionamiento/verificar-expediente/', {
      params: { numero_expediente, anio },
    }),

  getTiposLicencia: () =>
    api.get('/api/lf-itse/tipos-licencia/', { params: { esta_activo: 'true' } }),

  getNivelesRiesgo: () =>
    api.get('/api/lf-itse/niveles-riesgo/', { params: { esta_activo: 'true' } }),

  getZonificaciones: () =>
    api.get('/api/lf-itse/zonificaciones/', { params: { esta_activo: 'true' } }),

  buscarGiros: (busqueda) =>
    api.get('/api/lf-itse/giros/buscar/', { params: { busqueda, esta_activo: 'true' } }),

  getEstadosInactivosLf: () =>
    api.get('/api/lf-itse/estados/inactivos-lf/'),

  inactivarLicencia: (data) =>
    api.post('/api/lf-itse/licencias-funcionamiento/inactivar/', data),
}
