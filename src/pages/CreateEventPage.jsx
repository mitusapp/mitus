import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Sparkles, PartyPopper, Cake, Briefcase, Baby, Gift, Star, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const eventTypes = [
  { name: 'Boda', icon: <Heart className="w-8 h-8" />, key: 'boda' },
  { name: 'Quince Años', icon: <PartyPopper className="w-8 h-8" />, key: 'quince' },
  { name: 'Cumpleaños', icon: <Cake className="w-8 h-8" />, key: 'cumpleanos' },
  { name: 'Corporativo', icon: <Briefcase className="w-8 h-8" />, key: 'corporativo' },
  { name: 'Baby Shower', icon: <Baby className="w-8 h-8" />, key: 'babyshower' },
  { name: 'Aniversario', icon: <Gift className="w-8 h-8" />, key: 'aniversario' },
  { name: 'Otro', icon: <Star className="w-8 h-8" />, key: 'otro' },
];

const CreateEventPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    date: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectEventType = (type) => {
    setEventType(type);
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      toast({ title: "Campos requeridos", description: "Por favor completa el título y fecha del evento.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const eventId = Math.random().toString(36).substr(2, 8).toUpperCase();
      const eventData = {
        id: eventId,
        title: formData.title,
        date: formData.date,
        event_type: eventType,
        invitation_details: {
          hosts: [],
          welcome_message: `Bienvenidos a ${formData.title}`,
          countdown: true,
          agenda: [],
          dress_code: '',
          gift_info: {},
          song_suggestions: true,
          background_music: '',
        }
      };

      const { error } = await supabase.from('events').insert(eventData);
      if (error) throw error;

      toast({ title: "¡Evento creado exitosamente!", description: `Ahora personaliza tu invitación. Código: ${eventId}` });
      navigate(`/host/${eventId}/settings`);
    } catch (error) {
      console.error('Error creating event:', error);
      toast({ title: "Error al crear el evento", description: error.message || "Ocurrió un problema.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => step === 1 ? navigate('/') : setStep(1)} className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Crear Nuevo Evento</h1>
              <p className="text-gray-300">{step === 1 ? 'Paso 1: Elige el tipo de evento' : 'Paso 2: Detalles básicos'}</p>
            </div>
          </div>

          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {eventTypes.map((type) => (
                <motion.div
                  key={type.key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectEventType(type.key)}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center cursor-pointer flex flex-col items-center justify-center aspect-square"
                >
                  <div className="text-purple-300 mb-4">{type.icon}</div>
                  <h3 className="text-xl font-semibold text-white">{type.name}</h3>
                </motion.div>
              ))}
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-300" />
                  Información Básica del Evento
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2">Título del Evento *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Ej: Boda de Ana y Carlos"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-200 mb-2"><Calendar className="w-4 h-4 inline mr-1" />Fecha Principal *</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg rounded-xl shadow-2xl">
                {isSubmitting ? 'Creando...' : 'Continuar y Personalizar Invitación'}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CreateEventPage;
