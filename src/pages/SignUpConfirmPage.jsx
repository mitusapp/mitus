import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MailCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SignUpConfirmPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center">
          <MailCheck className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-semibold text-slate-900">¡Confirma tu correo!</h1>
          <p className="mt-2 text-slate-600">
            Te enviamos un enlace a tu correo electrónico. Ábrelo para activar tu cuenta.
          </p>
          <Button asChild variant="link" className="mt-4 text-purple-600">
            <Link to="/login">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver a iniciar sesión
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SignUpConfirmPage;
