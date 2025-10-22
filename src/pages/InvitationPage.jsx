
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Gift, Music, Camera, MessageSquare, Clock, Users, Shirt, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { loadTemplate } from '@/templates/loader';
import { applyTemplateTokens, clearTemplateTokens } from '@/templates/tokenBridge';
import HeroLayers from '@/components/gallery/HeroLayers';
import { DateTime } from 'luxon';



const Countdown = ({ date, time = '00:00', timeZone = 'America/Bogota' }) => {
  const getTargetMillis = useCallback(() => {
    // Construye un instante absoluto desde fecha+hora EN la zona del evento
    const dt = DateTime.fromISO(`${date}T${(time || '00:00').slice(0, 5)}`, { zone: timeZone });
    if (!dt.isValid) return null;
    return dt.toUTC().toMillis(); // instante absoluto
  }, [date, time, timeZone]);

  const calc = useCallback(() => {
    const target = getTargetMillis();
    if (!target) return null;
    const diff = target - Date.now();
    if (diff <= 0) return null;
    const s = Math.floor(diff / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return { días: d, horas: h, minutos: m, segundos: sec };
  }, [getTargetMillis]);

  const [timeLeft, setTimeLeft] = useState(calc());
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  if (!timeLeft) return null;

  return (
    <div className="flex justify-center gap-4 md:gap-8">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20 w-24">
          <div className="text-4xl md:text-5xl font-bold text-white">{String(value).padStart(2, '0')}</div>
          <div className="text-xs uppercase text-gray-300 tracking-widest">{unit}</div>
        </div>
      ))}
    </div>
  );
};


const RsvpForm = ({ onSubmit, eventId }) => {
  const [formData, setFormData] = useState({ name: '', attending: 'yes', party_size: 1, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Nombre requerido", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from('rsvps').insert({ ...formData, invitation_id: eventId });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Error al enviar RSVP", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Gracias por confirmar!", description: "Tu asistencia ha sido registrada." });
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Tu nombre completo</label>
        <input type="text" placeholder="Tu nombre completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="w-full p-3 rounded bg-white/10 border border-white/20 text-white" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">¿Asistirás?</label>
        <select value={formData.attending} onChange={(e) => setFormData({ ...formData, attending: e.target.value })} className="w-full p-3 rounded bg-white/10 border border-white/20 text-white">
          <option value="yes">Sí, asistiré</option>
          <option value="no">No podré asistir</option>
        </select>
      </div>
      {formData.attending === 'yes' && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Nº de asistentes (incluyéndote)</label>
          <input type="number" min="1" placeholder="Nº de asistentes" value={formData.party_size} onChange={(e) => setFormData({ ...formData, party_size: parseInt(e.target.value) || 1 })} className="w-full p-3 rounded bg-white/10 border border-white/20 text-white" />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Mensaje adicional (alergias, etc.)</label>
        <textarea placeholder="Mensaje adicional" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full p-3 rounded bg-white/10 border border-white/20 text-white" />
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Enviar Confirmación'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const InvitationPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, content: null, title: '' });
  const [songSuggestion, setSongSuggestion] = useState('');
  const [manifest, setManifest] = useState(null);

  // === Paso 6: integración de plantillas ===
  const heroRef = useRef(null);
  const location = useLocation();

  const tplKey = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    return (
      qp.get('tpl') ||
      event?.settings?.design?.template_key ||
      'eucalyptus-watercolor'
    );
  }, [location.search, event?.settings?.design?.template_key]);


  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (error || !data) {
      toast({ title: "Invitación no encontrada", variant: "destructive" });
      navigate('/');
      return;
    }
    setEvent(data);
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => { fetchEventData(); }, [fetchEventData]);
  // Aplica variables CSS del template al contenedor del hero
  useEffect(() => {
    if (!heroRef.current) return;

    const m = loadTemplate(tplKey) || loadTemplate('eucalyptus-watercolor');
    if (!m) return;
    setManifest(m);

    const mq = window.matchMedia('(max-width: 768px)');

    const applyAll = () => {
      if (!heroRef.current) return;
      clearTemplateTokens(heroRef.current);
      applyTemplateTokens(heroRef.current, m, mq.matches);

      // Compatibilidad: si el evento tiene cover_image_url, úsalo como fondo
      if (event?.cover_image_url) {
        heroRef.current.style.setProperty('--hero-image', `url("${event.cover_image_url}")`);
      }
    };

    applyAll();

    // Soporte moderno y Safari
    if (mq.addEventListener) mq.addEventListener('change', applyAll);
    else if (mq.addListener) mq.addListener(applyAll);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', applyAll);
      else if (mq.removeListener) mq.removeListener(applyAll);
      if (heroRef.current) clearTemplateTokens(heroRef.current);
    };
  }, [tplKey, event?.cover_image_url]);


  const handleGuestAccess = (action) => {
    const guestName = sessionStorage.getItem('guestName') || prompt('Por favor, ingresa tu nombre para continuar:');
    if (guestName) {
      sessionStorage.setItem('guestName', guestName);
      navigate(`/event/${eventId}/${action}`);
    } else {
      toast({ title: "Nombre requerido", description: "Debes ingresar un nombre para continuar." });
    }
  };

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    const guestName = sessionStorage.getItem('guestName') || 'Anónimo';
    const { error } = await supabase.from('song_suggestions').insert({ invitation_id: eventId, song_title: songSuggestion, guest_name: guestName });
    if (error) {
      toast({ title: "Error al sugerir canción", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Gracias por tu sugerencia!", description: "Hemos añadido tu canción a la lista." });
      setSongSuggestion('');
      setModal({ isOpen: false });
    }
  };

  const openModal = (type) => {
    const details = event.invitation_details || {};
    let content, title;
    switch (type) {
      case 'rsvp':
        title = 'Confirmar Asistencia';
        content = <RsvpForm eventId={eventId} onSubmit={() => setModal({ isOpen: false })} />;
        break;
      case 'gifts':
        title = 'Mesa de Regalos';
        content = <p>{details.gift_info?.message || 'Tu presencia es nuestro mejor regalo.'}</p>;
        break;
      case 'songs':
        title = 'Sugiere una Canción';
        content = (
          <form onSubmit={handleSongSubmit} className="space-y-4 text-left">
            <input type="text" placeholder="Nombre de la canción y artista" value={songSuggestion} onChange={(e) => setSongSuggestion(e.target.value)} required className="w-full p-3 rounded bg-white/10 border border-white/20 text-white" />
            <DialogFooter><Button type="submit" className="bg-purple-600 hover:bg-purple-700">Sugerir Canción</Button></DialogFooter>
          </form>
        );
        break;
      default: content = null;
    }
    setModal({ isOpen: true, content, title });
  };

  const handleViewOnMap = (loc) => {
    let url;
    if (loc.lat && loc.lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
    }
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando invitación...</p>
        </div>
      </div>
    );
  }

  const details = event.invitation_details || {};
  const Section = ({ children }) => <motion.section initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.7 }} className="py-16 px-4">{children}</motion.section>;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <section ref={heroRef} className="hero-surface relative h-screen flex items-center justify-center text-center overflow-hidden">
        {/* Capas decorativas PNG con animación; se alimentan de CSS vars */}
        <HeroLayers
          sequence={manifest?.defaults?.animation?.sequence}
          parallaxStrength={manifest?.defaults?.animation?.parallax?.strength ?? 8}
        />


        {/* Contenido existente dentro de zona segura (encima del decor) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="hero-safe relative z-20 p-4 w-full"
        >
          <h2 className="text-2xl md:text-4xl font-light tracking-widest mb-4">
            {details.hosts?.join(' y ') || 'Te invitan a'}
          </h2>

          <h1
            className="text-5xl md:text-8xl font-bold mb-8"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {event.title}
          </h1>

          {details.countdown && (
            <Countdown
              date={event.date}
              time={details.eventTime || '00:00'}
              timeZone={event?.event_timezone || 'America/Bogota'}
            />
          )}


        </motion.div>
      </section>


      <main>
        <Section>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-2xl md:text-3xl italic text-gray-300 mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>"{details.welcome_message || 'Con gran alegría queremos compartir este momento único y especial en nuestras vidas.'}"</p>
            <p className="text-lg md:text-xl text-gray-400">{details.invitation_text || 'Estás cordialmente invitado a celebrar con nosotros.'}</p>
          </div>
        </Section>

        <Section>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>Agenda del Evento</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {(details.locations || []).map((loc, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 text-left">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-purple-500/20 p-3 rounded-lg"><MapPin className="w-6 h-6 text-purple-300" /></div>
                    <h3 className="text-2xl font-semibold text-white">{loc.title}</h3>
                  </div>
                  <p className="text-gray-300 mb-1 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {(() => {
                      if (!loc.time) return 'Hora por confirmar';
                      const tz = event?.event_timezone || 'America/Bogota';
                      const hhmm = String(loc.time).slice(0, 5) || '00:00';
                      const dt = DateTime.fromISO(`${event.date}T${hhmm}`, { zone: tz });
                      if (!dt.isValid) return 'Hora por confirmar';
                      // Hora en zona del evento (ej. 5:00 p. m.)
                      return `${dt.toLocaleString(DateTime.TIME_SIMPLE)} (${tz})`;
                    })()}
                  </p>

                  <p className="text-gray-300 mb-4">{loc.address}</p>
                  <Button onClick={() => handleViewOnMap(loc)} variant="outline" className="border-white/20 text-white hover:bg-white/10">Ver en Mapa</Button>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {(details.indications || []).filter(ind => ind).length > 0 && (
          <Section>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>Indicaciones</h2>
              <div className="space-y-4">
                {(details.indications).filter(ind => ind).map((indication, i) => (
                  <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 flex items-center gap-4">
                    <div className="bg-blue-500/20 p-3 rounded-lg"><Shirt className="w-6 h-6 text-blue-300" /></div>
                    <p className="text-lg text-gray-200">{indication}</p>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        <Section>
          <div className="max-w-3xl mx-auto text-center bg-white/10 backdrop-blur-lg rounded-3xl p-10 border border-white/20">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Confirma tu Asistencia</h2>
            <p className="text-gray-300 mb-6">Tu respuesta es muy importante para nosotros. Por favor, confirma antes del día del evento.</p>
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg px-8 py-6 rounded-xl" onClick={() => openModal('rsvp')}><Users className="w-5 h-5 mr-2" />RSVP</Button>
          </div>
        </Section>

        <div className="py-16 px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActionButton icon={<Camera />} title="Sube tus Fotos" onClick={() => handleGuestAccess('upload')} />
            <ActionButton icon={<MessageSquare />} title="Libro de Visitas" onClick={() => handleGuestAccess('guestbook')} />
            <ActionButton icon={<Gift />} title="Mesa de Regalos" onClick={() => openModal('gifts')} />
            <ActionButton icon={<Music />} title="Sugiere una Canción" onClick={() => openModal('songs')} />
            <ActionButton icon={<Calendar />} title="Guardar Fecha" onClick={() => toast({ title: "Funcionalidad no implementada" })} />
            <ActionButton icon={<Users />} title="Ver Invitados" onClick={() => toast({ title: "Funcionalidad no implementada" })} />
          </div>
        </div>
      </main>

      <Dialog open={modal.isOpen} onOpenChange={(isOpen) => setModal({ ...modal, isOpen })}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-purple-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">{modal.title}</DialogTitle>
          </DialogHeader>
          <div className="py-4">{modal.content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ActionButton = ({ icon, title, onClick }) => (
  <motion.div whileHover={{ y: -5, scale: 1.03 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center cursor-pointer" onClick={onClick}>
    <div className="text-purple-300 mb-3 inline-block">{React.cloneElement(icon, { className: "w-8 h-8" })}</div>
    <h3 className="font-semibold text-white text-lg">{title}</h3>
  </motion.div>
);

export default InvitationPage;
