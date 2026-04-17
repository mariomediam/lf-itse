import api from './axios'

export const personasApi = {
  buscar: (filtro, valor) =>
    api.get('/api/lf-itse/personas/buscar/', { params: { filtro, valor } }),

  getSexos: () =>
    api.get('/api/lf-itse/personas/sexos'),

  getTiposDocumento: (tipo_persona) =>
    api.get('/api/lf-itse/tipos-documento-identidad/', { params: { tipo_persona } }),

  consultarReniec: (dni) =>
    api.get('/api/lf-itse/reniec/consultar/', { params: { dni } }),

  consultarSunat: (ruc) =>
    api.get('/api/lf-itse/sunat/consultar/', { params: { ruc } }),

  crearPersona: (data) =>
    api.post('/api/lf-itse/personas/', data),
}
