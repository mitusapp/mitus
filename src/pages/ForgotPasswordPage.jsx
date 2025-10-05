import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setLoading(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada para las instrucciones.' });
      setSent(true);
    }
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
            <h1 className="text-2xl font-semibold text-slate-900">Recuperar contraseña</h1>
            <p className="mt-2 text-sm text-slate-600">
              {sent ? 'Revisa tu correo electrónico.' : 'Ingresa tu correo para recibir instrucciones.'}
            </p>
          </div>

          {sent ? (
            <div className="text-center mt-6">
              <p className="text-slate-700">
                Si el correo es correcto, recibirás un enlace para restablecer tu contraseña en breve.
              </p>
              <Button asChild variant="link" className="text-purple-600 mt-4">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver a iniciar sesión
                </Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-5 mt-6" onSubmit={handlePasswordReset}>
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

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full text-white bg-purple-600 hover:bg-purple-700 rounded-xl"
              >
                {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
              </Button>
            </form>
          )}

          {!sent && (
            <div className="text-center mt-4">
              <Button asChild variant="link" className="text-purple-600">
                <Link to="/login">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Volver a iniciar sesión
                </Link>
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
