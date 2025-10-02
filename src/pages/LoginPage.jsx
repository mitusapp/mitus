
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const GoogleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.5,18.33 21.5,12.33C21.5,11.76 21.45,11.43 21.35,11.1Z"></path></svg>;
const AppleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19.2,12.89c-1.21,0-2.33.69-2.9,1.82-.55,1.12-.7,2.39,0,3.68,1.13,2.07,3.25,4.18,5.7,4.18,0,0,.06-1.11,.06-2.24,0-2.6-1.45-3.94-3.02-3.94s-2.21,1.19-2.21,1.19c.11-1.18,.75-2.33,2.06-2.33s1.68,.8,2.33,.8c0,0-.2-1.18-1.02-2.16Z M15.53,11.3c.25-1.53.31-3.2,0-4.15-1.13-1.3-2.6-1.48-3.32-1.53-.92,0-2.36,.14-3.48,1.3-1.3,1.3-2.06,3.31-1.88,5.1,1.06,0,2.21-.69,3.31-.69s2.21,.69,3.06,.69c.86,0,2.06-.75,2.06-.75Z"></path></svg>;

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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl"
      >
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Inicia sesión en tu cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            o{' '}
            <Link to="/signup" className="font-medium text-purple-400 hover:text-purple-300">
              crea una cuenta nueva
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => handleOAuthSignIn('google')} disabled={loading}>
            <GoogleIcon /> <span className="ml-2">Google</span>
          </Button>
          <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => handleOAuthSignIn('apple')} disabled={loading}>
            <AppleIcon /> <span className="ml-2">Apple</span>
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-800 text-gray-400">O continúa con</span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 placeholder-gray-400 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 placeholder-gray-400 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-purple-400 hover:text-purple-300">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {loading ? 'Iniciando...' : <><LogIn className="w-5 h-5 mr-2" /> Iniciar Sesión</>}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
