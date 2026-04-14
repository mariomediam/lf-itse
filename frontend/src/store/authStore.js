import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { authApi } from '@api/authApi';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setTokens: (access, refresh) => set({ 
        accessToken: access, 
        refreshToken: refresh 
      }),

      login: async (username, password) => {
        set({ loading: true, error: null });
        
        try {
          const { access, refresh } = await authApi.login(username, password);
          localStorage.setItem('access_token', access);
          localStorage.setItem('refresh_token', refresh);
          set({ accessToken: access, refreshToken: refresh });
          
          const userData = await authApi.getCurrentUser();
          set({ 
            user: userData, 
            isAuthenticated: true,
            loading: false 
          });
          
          return { success: true };
        } catch (error) {
          let errorMessage = 'Error al iniciar sesión';
          
          if (error.response?.status === 401) {
            errorMessage = 'Usuario o contraseña incorrectos';
          } else if (error.response?.status === 400) {
            errorMessage = 'Por favor verifica tus credenciales';
          } else if (error.response?.data?.detail) {
            errorMessage = error.response.data.detail;
          } else if (!error.response) {
            errorMessage = 'Error de conexión. Verifica tu red';
          }
          
          toast.error(errorMessage);
          set({ loading: false });
          return { success: false, error: errorMessage };
        }
      },

      register: async (username, password, email) => {
        set({ loading: true, error: null });
        try {
          await authApi.register(username, password, email);
          toast.success('Usuario registrado exitosamente');
          return await get().login(username, password);
        } catch (error) {
          let errorMessage = 'Error al registrar usuario';
          
          if (error.response?.status === 400) {
            if (error.response?.data?.username?.[0]) {
              errorMessage = `Usuario: ${error.response.data.username[0]}`;
            } else if (error.response?.data?.email?.[0]) {
              errorMessage = `Email: ${error.response.data.email[0]}`;
            } else if (error.response?.data?.password?.[0]) {
              errorMessage = `Contraseña: ${error.response.data.password[0]}`;
            }
          } else if (!error.response) {
            errorMessage = 'Error de conexión. Verifica tu red';
          }
          
          toast.error(errorMessage);
          set({ loading: false });
          return { success: false, error: errorMessage };
        }
      },

      logout: () => {
        authApi.logout();
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null, 
          isAuthenticated: false 
        });
      },

      checkAuth: async () => {
        set({ loading: true });
        const token = localStorage.getItem('access_token');
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (token && refreshToken) {
          try {
            const userData = await authApi.getCurrentUser();
            set({ 
              user: userData, 
              isAuthenticated: true,
              accessToken: token,
              refreshToken: refreshToken,
              loading: false
            });
          } catch (error) {
            console.error('Error al verificar autenticación:', error);
            authApi.logout();
            set({ 
              user: null, 
              accessToken: null, 
              refreshToken: null, 
              isAuthenticated: false,
              loading: false
            });
          }
        } else {
          set({ loading: false });
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;