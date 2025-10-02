
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
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } else {
      toast({
        title: "Correo enviado",
        description: "Revisa tu bandeja de entrada para las instrucciones.",
      });
      setSent(true);
    }
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
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            {sent ? "Revisa tu correo electrónico." : "Ingresa tu correo para recibir instrucciones."}
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <p className="text-white">Si el correo es correcto, recibirás un enlace para restablecer tu contraseña en breve.</p>
            <Button asChild variant="link" className="text-purple-400 mt-4">
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver a iniciar sesión
              </Link>
            </Button>
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handlePasswordReset}>
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

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </div>
          </form>
        )}
        
        {!sent && (
          <div className="text-center">
            <Button asChild variant="link" className="text-purple-400">
              <Link to="/login">
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver a iniciar sesión
              </Link>
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
