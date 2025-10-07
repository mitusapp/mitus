import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, User as UserIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SignUpPage = () => {
  const { signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/profile', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    await signUp(email, password, { data: { full_name: fullName } });
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
        {/* card */}
        <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
          {/* Back button (top-left of card) */}
          <div className="absolute top-4 left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="p-2 rounded-full text-slate-500 hover:text-purple-600 hover:bg-slate-100/70 focus-visible:ring-2 focus-visible:ring-purple-300"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Crea una cuenta nueva</h1>
            <p className="mt-2 text-sm text-slate-600">
              o{' '}
              <Link to="/login" className="font-medium text-purple-600 hover:text-purple-700">
                inicia sesión si ya tienes una
              </Link>
            </p>
          </div>

          <form className="space-y-5 mt-6" onSubmit={handleSignUp}>
            <div className="space-y-4">
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="full-name"
                  name="full-name"
                  type="text"
                  required
                  className="appearance-none rounded-xl w-full pl-10 pr-3 py-3 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

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
                  autoComplete="new-password"
                  required
                  minLength="6"
                  className="appearance-none rounded-xl w-full pl-10 pr-3 py-3 bg-white border border-slate-300 placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Contraseña (mín. 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
            >
              {loading ? 'Creando cuenta…' : (<><UserPlus className="w-5 h-5 mr-2" /> Crear Cuenta</>)}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUpPage;
