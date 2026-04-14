import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@store/authStore';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login, loading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUsernameError('');
    setPasswordError('');

    let hasError = false;

    if (!username.trim()) {
      setUsernameError('El usuario es requerido');
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError('La contraseña es requerida');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const result = await login(username, password);
    
    if (result.success) {
      navigate('/products');
    }
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-2xl px-8 pt-8 pb-8">
        <div className="mb-8 text-center">
          <h1 className="text-gray-600 text-lg font-semibold">Inicia sesión en tu cuenta.</h1>
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">
            Usuario
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (usernameError) setUsernameError('');
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
              usernameError 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
            }`}
            placeholder="Ingresa tu usuario"
            disabled={loading}
          />
          {usernameError && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {usernameError}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition duration-200 ${
              passwordError 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-transparent'
            }`}
            placeholder="Ingresa tu contraseña"
            disabled={loading}
          />
          {passwordError && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {passwordError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center">
            <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span className="ml-2 text-sm text-gray-600">Recordarme</span>
          </label>
          <a href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Olvidé mi contraseña
          </a>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Iniciando sesión...
            </span>
          ) : (
            'Iniciar sesión'
          )}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            No tienes una cuenta?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              Registrarse
            </a>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;