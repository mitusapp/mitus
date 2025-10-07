// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ArrowLeft } from 'lucide-react';
import { SiApple } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// ✅ Flag para ocultar/mostrar Apple por entorno
const ENABLE_APPLE = import.meta.env.VITE_AUTH_APPLE_ENABLED === 'true';

// Icono de Google (SVG inline para no depender de libs externas)
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.596 32.657 29.334 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.156 7.957 3.043l5.657-5.657C34.675 6.053 29.64 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.382 16.107 18.82 12 24 12c3.059 0 5.842 1.156 7.957 3.043l5.657-5.657C34.675 6.053 29.64 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
    <path fill="#4CAF50" d="M24 44c5.258 0 10.055-2.015 13.659-5.303l-6.305-5.332C29.306 34.438 26.809 35.5 24 35.5c-5.303 0-9.799-3.587-11.387-8.429l-6.57 5.06C8.327 39.62 15.547 44 24 44z"/>
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.009 2.873-3.144 5.223-5.644 6.362l6.305 5.332C39.635 36.6 44 30.969 44 24c0-1.341-.138-2.651-.389-3.917z"/>
  </svg>
);

const LoginPage = () => {
  const { signIn, signInWithProvider } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOAuthSignIn = async (provider) => {
    try {
      setError('');
      setLoading(true);
      await signInWithProvider(provider); // Redirige; onAuthStateChange decide el destino
    } catch (e) {
      setError(e?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const { error } = await signIn(email, password);
      if (error) throw error;
      // Navegación la maneja el contexto (postLoginRedirect o /profile)
    } catch (e) {
      setError(e?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  // clases de input para asegurar texto oscuro sin tocar otros elementos
  const inputClasses =
    "w-full h-11 pl-10 pr-3 rounded-xl border border-slate-300 " +
    "bg-white text-slate-900 placeholder-slate-400 caret-purple-600 " +
    "focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400";

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative bg-white/90 border border-slate-200 rounded-2xl shadow-sm p-8">
          <div className="absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.assign('/')}
              className="p-2 rounded-full text-slate-500 hover:text-purple-600 hover:bg-slate-100/70 focus-visible:ring-2 focus-visible:ring-purple-300"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Iniciar sesión</h1>
            <p className="text-slate-500 text-sm">Accede a tu panel para gestionar tus eventos</p>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}

          {ENABLE_APPLE ? (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-slate-300 text-slate-100 hover:bg-slate-50"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
              >
                <GoogleIcon />
                <span className="ml-2">Google</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                className="h-11 border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => handleOAuthSignIn('apple')}
                disabled={loading}
              >
                <SiApple className="w-5 h-5" aria-hidden="true" />
                <span className="ml-2">Apple</span>
              </Button>
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <Button
                type="button"
                variant="outline"
                className="h-11 border-slate-300 text-slate-100 hover:bg-slate-50"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
              >
                <GoogleIcon />
                <span className="ml-2">Google</span>
              </Button>
            </div>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white text-slate-500">o continúa con</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  placeholder="tucorreo@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClasses}
                  placeholder="Tu contraseña"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700">
                ¿Olvidaste tu contraseña?
              </Link>
              <Link to="/signup" className="text-sm text-slate-600 hover:text-slate-800">
                Crear cuenta con correo
              </Link>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              {loading ? 'Iniciando…' : (<><LogIn className="w-5 h-5 mr-2" /> Iniciar Sesión</>)}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
