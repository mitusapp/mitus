// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { SiApple } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 533.5 544.3" aria-hidden="true">
    <path fill="#4285F4" d="M533.5 278.4c0-18.4-1.6-36.1-4.7-53.2H272.1v100.9h146.9c-6.4 34.5-26 63.7-55.4 83.2v68h89.6c52.4-48.3 80.3-119.6 80.3-198.9z"/>
    <path fill="#34A853" d="M272.1 544.3c73.7 0 135.6-24.4 180.8-66.1l-89.6-68c-24.9 16.7-56.8 26.6-91.1 26.6-70 0-129.3-47.3-150.6-110.9H30.3v69.6c45 88.9 136.9 148.8 241.8 148.8z"/>
    <path fill="#FBBC05" d="M121.5 325.9c-10.2-30.5-10.2-63.4 0-94l.1-69.5H30.3c-40.8 81.4-40.8 176.2 0 257.6l91.1-69.6z"/>
    <path fill="#EA4335" d="M272.1 106.4c39.9-.6 78.1 14 107.4 41.4l80.3-80.3C412.9 25.2 348.8-.1 272.1 0 167.2 0 75.3 59.9 30.3 148.8l91.1 69.6C142.7 154.8 202.1 107.5 272.1 106.4z"/>
  </svg>
);

const LoginPage = () => {
  const { signIn, signInWithProvider } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signIn(email, password);
    setLoading(false);
  };

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    await signInWithProvider(provider);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Inicia sesión en tu cuenta</h1>
            <p className="mt-2 text-sm text-slate-600">
              o{' '}
              <Link to="/signup" className="font-medium text-purple-600 hover:text-purple-700">
                crea una cuenta nueva
              </Link>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
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
              className="h-11 border-slate-300 text-slate-100 hover:bg-slate-50"
              onClick={() => handleOAuthSignIn('apple')}
              disabled={loading}
            >
              <SiApple className="w-5 h-5" aria-hidden="true" />
              <span className="ml-2">Apple</span>
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-white text-slate-500">o continúa con</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-xl w-full pl-10 pr-3 py-3 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-xl w-full pl-10 pr-3 py-3 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                ¿Olvidaste tu contraseña?
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
