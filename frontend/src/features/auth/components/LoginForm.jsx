import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '@store/authStore';
import UserIcon from '@components/icons/UserIcon';
import LockIcon from '@components/icons/LockIcon';

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

    if (hasError) return;

    const result = await login(username, password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">

      {/* Campo usuario */}
      <div>
        <label
          htmlFor="username"
          className="block text-xs font-bold tracking-widest text-secondary uppercase mb-2"
        >
          Usuario
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
            <UserIcon width={18} height={18} />
          </span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (usernameError) setUsernameError('');
            }}
            placeholder="Ingrese su usuario"
            disabled={loading}
            className={`w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:ring-2 disabled:opacity-50 ${
              usernameError
                ? 'ring-2 ring-danger focus:ring-danger'
                : 'focus:ring-primary/40'
            }`}
          />
        </div>
        {usernameError && (
          <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {usernameError}
          </p>
        )}
      </div>

      {/* Campo contraseña */}
      <div>
        <label
          htmlFor="password"
          className="block text-xs font-bold tracking-widest text-secondary uppercase mb-2"
        >
          Contraseña
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary pointer-events-none">
            <LockIcon width={18} height={18} />
          </span>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError('');
            }}
            placeholder="••••••••••"
            disabled={loading}
            className={`w-full pl-10 pr-4 py-3 bg-gray-100 rounded-lg text-sm text-gray-700 placeholder-gray-400 outline-none transition focus:ring-2 disabled:opacity-50 ${
              passwordError
                ? 'ring-2 ring-danger focus:ring-danger'
                : 'focus:ring-primary/40'
            }`}
          />
        </div>
        {passwordError && (
          <p className="mt-1.5 text-xs text-danger flex items-center gap-1">
            <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {passwordError}
          </p>
        )}
      </div>

      {/* Botón submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-white text-sm font-semibold py-3 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Iniciando sesión...
          </span>
        ) : (
          'Iniciar sesión'
        )}
      </button>

    </form>
  );
};

export default LoginForm;
