import api from './axios'

export const dashboardApi = {
  getExpedientesPendientes: () =>
    api.get('/api/lf-itse/expedientes/pendientes/'),

  getMenusUsuario: () =>
    api.get('/api/lf-itse/usuarios/menus/'),
}
