import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos
});

// ==================== REQUEST INTERCEPTOR ====================
// Se ejecuta ANTES de cada petición
api.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage
    const token = localStorage.getItem('access_token');
    
    // Si existe token, agregarlo al header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log para debugging (opcional, quitar en producción)
    console.log('📤 Request:', config.method.toUpperCase(), config.url);
    
    return config;
  },
  (error) => {
    // Manejar error antes de enviar la petición
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTOR ====================
// Se ejecuta DESPUÉS de recibir cada respuesta
api.interceptors.response.use(
  (response) => {
    // Si la respuesta es exitosa (2xx), retornarla
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log del error
    console.error('❌ Response error:', error.response?.status, error.config?.url);

    // Si es error 401 (Unauthorized) y NO es el endpoint de login/register
    const isAuthEndpoint = originalRequest.url?.includes('/api/auth/jwt/create/') || 
                          originalRequest.url?.includes('/api/auth/users/');
    
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        console.log('🔄 Token expirado, intentando refrescar...');
        
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth/jwt/refresh/`,
          { refresh: refreshToken }
        );

        const { access, refresh } = response.data;
        
        localStorage.setItem('access_token', access);
        if (refresh) {
          localStorage.setItem('refresh_token', refresh);
        }

        originalRequest.headers.Authorization = `Bearer ${access}`;
        
        console.log('✅ Token refrescado exitosamente');
        
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Error al refrescar token:', refreshError);
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      }
    }

    // Si es error 403 (Forbidden)
    if (error.response?.status === 403) {
      console.error('🚫 Acceso denegado');
      // Puedes mostrar un mensaje o redirigir
    }

    // Si es error 404 (Not Found)
    if (error.response?.status === 404) {
      console.error('🔍 Recurso no encontrado');
    }

    // Si es error 500 (Server Error)
    if (error.response?.status === 500) {
      console.error('💥 Error del servidor');
    }

    // Retornar el error para que lo maneje el componente
    return Promise.reject(error);
  }
);

export default api;