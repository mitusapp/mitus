
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, Heart, CheckCircle, Edit, X, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { wizardSteps } from './InvitationWizard';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const TemplateComponent = ({ formData }) => {
  const imagePreview = sessionStorage.getItem('wizardImagePreview') || formData.eventImagePreview;

  const getInitials = (hosts) => {
    if (!hosts) return 'S & D';
    const names = hosts.split(/&|y/i).map(n => n.trim());
    if (names.length >= 2) {
      return `${names[0]?.[0] || ''} & ${names[1]?.[0] || ''}`;
    }
    return hosts[0]?.toUpperCase() || '?';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return { month: 'JUL', day: '26', year: '2025', weekday: 'SÁBADO' };
    const date = new Date(dateStr + 'T00:00:00');
    return {
      month: date.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase().replace('.', ''),
      day: date.toLocaleDateString('es-ES', { day: '2-digit' }),
      year: date.toLocaleDateString('es-ES', { year: 'numeric' }),
      weekday: date.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase(),
    };
  };

  const { month, day, year, weekday } = formatDate(formData.eventDate);

  return (
    <div className="font-serif bg-[#f5f1ea] text-[#5c5c5c] w-full max-w-full overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/watercolor.png')] opacity-30"></div>
      <img
        alt="Top left floral decoration"
        className="absolute top-0 left-0 w-1/3 md:w-1/4 pointer-events-none -translate-x-1/4 -translate-y-1/4 opacity-70"
       src="https://images.unsplash.com/photo-1612619279122-91aed274571a" />
      <img
        alt="Top right floral decoration"
        className="absolute top-0 right-0 w-1/3 md:w-1/4 pointer-events-none translate-x-1/4 -translate-y-1/4 opacity-70"
       src="https://images.unsplash.com/photo-1612619279122-91aed274571a" />

      <div className="text-center pt-24 pb-12 px-4 relative z-10">
        <p className="text-4xl tracking-widest" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{getInitials(formData.hosts)}</p>
      </div>

      {imagePreview ? (
        <div className="relative px-4 py-8 text-center z-10">
          <img
            alt="Bottom left floral decoration for image"
            className="absolute bottom-0 left-0 w-1/3 pointer-events-none -translate-x-1/4 translate-y-1/4 opacity-50"
           src="https://images.unsplash.com/photo-1685780902027-95005bd1553f" />
          <img
            alt="Top right floral decoration for image"
            className="absolute top-0 right-0 w-1/3 pointer-events-none translate-x-1/4 -translate-y-1/4 opacity-50"
           src="https://images.unsplash.com/photo-1675353436532-890a973388be" />
          <img src={imagePreview} alt="Evento" className="w-full max-w-sm mx-auto h-auto object-cover rounded-full aspect-square shadow-2xl" style={{ clipPath: 'ellipse(50% 50% at 50% 50%)' }} />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-transparent py-12">
            <div className="w-48 h-48 rounded-full border-2 border-black/20 flex items-center justify-center bg-white/30">
                <span className="text-6xl font-bold text-black/50" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{getInitials(formData.hosts)}</span>
            </div>
        </div>
      )}

      <div className="text-center py-12 px-4 relative z-10">
        <h1 className="text-5xl md:text-7xl" style={{ fontFamily: "'Playfair Display', serif" }}>{formData.hosts || 'Sarah & David'}</h1>
        <p className="text-2xl tracking-[0.2em] mt-2 uppercase" style={{ fontFamily: "'Montserrat', sans-serif" }}>{formData.eventName || 'NUESTRA BODA'}</p>
      </div>

      <div className="relative text-center py-12 px-8 z-10">
        <p className="text-lg italic max-w-md mx-auto" style={{ fontFamily: "'Cormorant Garamond', serif" }}>"{formData.initialMessage || 'Amamos porque él nos amó primero'}"</p>
        <p className="text-sm mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>1 Juan 4:19</p>
      </div>

      <div className="text-center py-12 px-4 relative z-10">
        <h2 className="text-5xl md:text-6xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>{formData.hosts || 'Sarah & David'}</h2>
        <p className="max-w-md mx-auto text-lg" style={{ fontFamily: "'Montserrat', sans-serif" }}>{formData.invitationMessage || 'Te invitamos a nuestra ceremonia de boda que se llevará a cabo el'}</p>
      </div>

      <div className="text-center py-8 px-4 relative z-10">
        <div className="flex justify-center items-center gap-4 text-5xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>
          <span>{month}</span>
          <span className="text-gray-400">•</span>
          <span>{day}</span>
          <span className="text-gray-400">•</span>
          <span>{year}</span>
        </div>
        <p className="text-xl mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>{weekday} {formData.eventTime ? new Date(`1970-01-01T${formData.eventTime}`).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }) : '2:00 P.M.'}</p>
      </div>

      <div className="text-center py-8 relative z-10">
        <Button variant="outline" className="rounded-full border-[#c9bba7] text-[#8c7a64] bg-transparent hover:bg-[#c9bba7]/20 h-24 w-24 flex flex-col items-center justify-center shadow-lg">
          <Heart className="w-6 h-6 mb-1" />
          <span className="text-xs font-sans">Guardar</span>
          <span className="text-xs font-sans">Fecha</span>
        </Button>
      </div>

      <div className="py-12 px-4 text-center relative z-10">
        <h3 className="text-4xl mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>Ubicación</h3>
        <div className="space-y-8 max-w-md mx-auto">
          {formData.locations.map((loc, i) => (
            <div key={i} className="bg-white/50 p-6 rounded-lg shadow-md">
              <p className="text-2xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{loc.title}</p>
              <p className="text-md font-sans">{loc.time ? new Date(`1970-01-01T${loc.time}`).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''}</p>
              <p className="text-md mb-4 font-sans">{loc.address}</p>
              <Button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`, '_blank')} variant="outline" className="rounded-full border-[#c9bba7] text-[#8c7a64] bg-transparent hover:bg-[#c9bba7]/20">
                <MapPin className="w-4 h-4 mr-2" />
                Abrir Mapa
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="py-12 px-4 text-center relative z-10">
        <h3 className="text-4xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Indicaciones</h3>
        <ul className="space-y-2 font-sans max-w-md mx-auto">
          {formData.indications.filter(ind => ind).map((ind, i) => <li key={i} className="bg-white/30 p-3 rounded-md">{ind}</li>)}
        </ul>
      </div>

      <div className="py-12 px-4 text-center bg-[#e9e4dd]/80 relative z-10">
        <CheckCircle className="w-10 h-10 mx-auto mb-4 text-[#8c7a64]" />
        <h3 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>¡Confirmar Asistencia!</h3>
        <p className="font-sans">Antes del 20-06-2025</p>
        <Button className="mt-4 bg-[#8c7a64] hover:bg-[#736351] text-white rounded-full">Confirmar</Button>
      </div>
      <img
        alt="Bottom floral decoration"
        className="w-full pointer-events-none opacity-60"
       src="https://images.unsplash.com/photo-1612619279122-91aed274571a" />
    </div>
  );
};

const InvitationPreview = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const createEventInSupabase = useCallback(async (current_form_data) => {
    if (!current_form_data) {
      toast({ title: "Error", description: "Faltan datos para crear el evento.", variant: "destructive" });
      return null;
    }
    if (!user) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para crear un evento.", variant: "destructive" });
      return null;
    }
    setIsSubmitting(true);
    try {
      const eventId = Math.random().toString(36).substr(2, 8).toUpperCase();
      let cover_image_url = null;
      const imagePreview = sessionStorage.getItem('wizardImagePreview');

      if (imagePreview) {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        const fileExt = blob.type.split('/')[1] || 'png';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `public/${eventId}/${fileName}`;
        
        let { error: uploadError } = await supabase.storage.from('event-covers').upload(filePath, blob);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('event-covers').getPublicUrl(filePath);
        cover_image_url = urlData.publicUrl;
      }

      const eventData = {
        id: eventId,
        user_id: user.id,
        title: current_form_data.eventName,
        date: current_form_data.eventDate,
        event_type: current_form_data.eventType,
        cover_image_url: cover_image_url,
        invitation_details: {
          hosts: current_form_data.hosts.split(/&|y/i).map(h => h.trim()),
          welcome_message: current_form_data.initialMessage,
          invitation_text: current_form_data.invitationMessage,
          event_time: current_form_data.eventTime,
          locations: current_form_data.locations,
          indications: current_form_data.indications,
          template: current_form_data.template,
          countdown: true,
        },
      };

      const { error } = await supabase.from('events').insert(eventData);
      if (error) throw error;

      localStorage.removeItem('wizardFormData');
      sessionStorage.removeItem('wizardImagePreview');
      toast({ title: "¡Evento activado!", description: `Tu evento ha sido guardado. Código: ${eventId}` });
      return eventId;
    } catch (error) {
      console.error('Error activating event:', error);
      toast({ title: "Error al activar", description: error.message, variant: "destructive" });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [user]);

  useEffect(() => {
    const savedData = localStorage.getItem('wizardFormData');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      const imagePreview = sessionStorage.getItem('wizardImagePreview');
      setFormData({ ...parsedData, eventImagePreview: imagePreview });
    } else {
      navigate('/wizard');
    }
  }, [navigate]);

  const handleActivate = async () => {
    const newEventId = await createEventInSupabase(formData);
    if (newEventId) {
      navigate(`/host/${newEventId}`);
    }
  };

  const handleEditStep = (step) => {
    navigate(`/wizard?step=${step}`);
    setIsMenuOpen(false);
  };

  if (!formData) {
    return <div className="min-h-screen flex items-center justify-center text-white"><p>Cargando vista previa...</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-0 left-0 h-full w-72 bg-gray-800/90 backdrop-blur-sm rounded-r-2xl p-6 border-r border-white/20 z-50"
            >
              <h2 className="text-xl font-semibold text-white mb-6">Editar Pasos</h2>
              <ul className="space-y-2">
                {wizardSteps.map(step => (
                  <li key={step.id}>
                    <button onClick={() => handleEditStep(step.id)} className="w-full text-left flex items-center gap-3 p-3 rounded-lg text-white hover:bg-purple-600/50 transition-colors">
                      {React.cloneElement(step.icon, { className: "w-5 h-5 text-purple-300" })}
                      <span className="font-sans">{step.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="fixed top-4 left-4 z-50">
        <Button onClick={() => setIsMenuOpen(!isMenuOpen)} size="icon" className="bg-white/20 hover:bg-white/30 backdrop-blur-sm">
          {isMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <main className="w-full">
        <div className="bg-yellow-900/50 border-t border-b border-yellow-700 text-yellow-300 p-3 text-center text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <p>Estás en modo vista previa. Activa el servicio para guardar y compartir.</p>
        </div>

        <div className="w-full max-w-4xl mx-auto">
            <TemplateComponent formData={formData} />
        </div>

        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-gray-900 to-transparent text-center z-30">
          <Button onClick={handleActivate} size="lg" className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold shadow-lg" disabled={isSubmitting}>
            {isSubmitting ? 'Activando...' : 'Activar Invitación'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InvitationPreview;
