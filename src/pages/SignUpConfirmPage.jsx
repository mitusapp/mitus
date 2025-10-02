
import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SignUpConfirmPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl text-center"
      >
        <MailCheck className="mx-auto h-16 w-16 text-green-400" />
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            ¡Confirma tu correo!
          </h2>
          <p className="mt-2 text-center text-lg text-gray-300">
            Hemos enviado un enlace de confirmación a tu correo electrónico. Por favor, haz clic en el enlace para activar tu cuenta.
          </p>
        </div>
        <Button asChild variant="link" className="text-purple-400 mt-4">
          <Link to="/login">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver a iniciar sesión
          </Link>
        </Button>
      </motion.div>
    </div>
  );
};

export default SignUpConfirmPage;
