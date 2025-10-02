
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PlannerProviders from '@/pages/planner/PlannerProviders';

const GlobalSettingsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/profile`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Configuraciones Globales</h1></div>
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-3 text-blue-300" />
              Directorio Global de Proveedores
            </h2>
            <p className="text-gray-400 mb-6">
              Gestiona tu lista de proveedores aquí. Podrás asignarlos a cualquiera de tus eventos.
            </p>
            <PlannerProviders isGlobal={true} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GlobalSettingsPage;
