import api from '@api/axios';

export const authApi = {
  login: async (username, password) => {
    const response = await api.post('/api/auth/jwt/create/', {
      username,
      password,
    });
    return response.data;
  },

  register: async (username, password, email) => {
    const response = await api.post('/api/auth/users/', {
      username,
      password,
      email,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/users/me/');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/api/auth/jwt/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  verifyToken: async (token) => {
    const response = await api.post('/api/auth/jwt/verify/', {
      token,
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};