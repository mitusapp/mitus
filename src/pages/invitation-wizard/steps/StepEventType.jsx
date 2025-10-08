import React from 'react';
import { Heart, PartyPopper, Cake, Briefcase, Baby, Gift, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const eventTypes = [
  { name: 'Boda', icon: <Heart className="w-8 h-8" />, key: 'boda' },
  { name: 'Quince Años', icon: <PartyPopper className="w-8 h-8" />, key: 'quince' },
  { name: 'Cumpleaños', icon: <Cake className="w-8 h-8" />, key: 'cumpleanos' },
  { name: 'Corporativo', icon: <Briefcase className="w-8 h-8" />, key: 'corporativo' },
  { name: 'Baby Shower', icon: <Baby className="w-8 h-8" />, key: 'babyshower' },
  { name: 'Aniversario', icon: <Gift className="w-8 h-8" />, key: 'aniversario' },
  { name: 'Otro', icon: <Star className="w-8 h-8" />, key: 'otro' },
];

const StepEventType = ({ formData, setFormData, updateStep }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {eventTypes.map((type) => (
        <motion.div
          key={type.key}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setFormData((p) => ({ ...p, eventType: type.key }));
            updateStep(2);
          }}
          className={`rounded-2xl p-6 border-2 text-center cursor-pointer transition ${
            formData.eventType === type.key
              ? 'border-violet-500 bg-violet-50'
              : 'border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          <div className="text-violet-600 mb-4">{type.icon}</div>
          <h3 className="text-base font-medium text-slate-800">{type.name}</h3>
        </motion.div>
      ))}
    </div>
  );
};

export default StepEventType;
