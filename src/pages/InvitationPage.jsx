import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Gift,
  Music,
  Camera,
  MessageSquare,
  Clock,
  Users,
  Shirt,
  CheckCircle,
  Phone,
  Instagram,
  Hash,
  Bus,
  Hotel,
  UtensilsCrossed,
  Baby,
  ParkingSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { loadTemplate } from '@/templates/loader';
import { applyTemplateTokens, clearTemplateTokens } from '@/templates/tokenBridge';
import HeroLayers from '@/components/gallery/HeroLayers';
import { DateTime } from 'luxon';

// --- Draft preview support (?d=...) ---
function fromBase64Url(s) {
  if (!s) return null;
  try {
    const pad = s.length % 4 ? '===='.slice(s.length % 4) : '';
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const bytes = new Uint8Array([...bin].map(ch => ch.charCodeAt(0)));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// --- Helpers de seguridad y formato ---
const safeArr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const cleanPhone = (s) => (s || '').replace(/[^\d]/g, '');
const handleLink = (url) => {
  if (!url) return;
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    window.open(u, '_blank');
  } catch {
    window.open(url, '_blank');
  }
};

const niceDate = (isoDate, tz = 'America/Bogota') => {
  if (!isoDate) return '';
  const d = DateTime.fromISO(isoDate, { zone: tz }).setLocale('es');
  return d.isValid ? d.toLocaleString(DateTime.DATE_HUGE) : isoDate;
};

const niceTime = (hhmm, tz = 'America/Bogota') => {
  if (!hhmm) return '';
  const base = String(hhmm).slice(0, 5);
  const d = DateTime.fromISO(`1970-01-01T${base}`, { zone: tz }).setLocale('es');
  return d.isValid ? d.toLocaleString(DateTime.TIME_SIMPLE) : hhmm;
};

const makeICSAndDownload = ({ title, date, time = '00:00', tz = 'America/Bogota', locationText = '', description = '' }) => {
  if (!date) {
    toast({ title: 'Falta fecha del evento', variant: 'destructive' });
    return;
  }
  const start = DateTime.fromISO(`${date}T${String(time).slice(0, 5)}`, { zone: tz });
  const end = start.plus({ hours: 2 });
  if (!start.isValid) {
    toast({ title: 'Fecha/hora inválida', variant: 'destructive' });
    return;
  }
  const dtStart = start.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const dtEnd = end.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  const uid = `${Date.now()}@mitus`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mitus//Invitation//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${DateTime.utc().toFormat("yyyyMMdd'T'HHmmss'Z'")}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${(title || 'Evento')}`.replace(/\n/g, ' '),
    `DESCRIPTION:${(description || '').replace(/\n/g, ' ')}`,
    `LOCATION:${(locationText || '').replace(/\n/g, ' ')}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'evento.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// --- Helpers de render para evitar "object as child" ---
const summarizeDressCode = (dc) => {
  // BD: invitation_details.dress_code (string | { men, women, notes })
  if (!dc) return '';
  if (typeof dc === 'string') return dc;
  const parts = [];
  if (dc.women) parts.push(`Ellas: ${dc.women}`);
  if (dc.men) parts.push(`Ellos: ${dc.men}`);
  if (dc.notes) parts.push(`Notas: ${dc.notes}`);
  return parts.join(' · ');
};

const DressCodeList = ({ dc }) => {
  if (!dc) return null;
  if (typeof dc === 'string') {
    return <p className="text-slate-700">{dc}</p>;
  }
  const items = [];
  if (dc.women) items.push({ label: 'Ellas', value: dc.women });
  if (dc.men) items.push({ label: 'Ellos', value: dc.men });
  if (dc.notes) items.push({ label: 'Notas', value: dc.notes });
  if (!items.length) return null;
  return (
    <ul className="space-y-1 text-slate-700">
      {items.map((it, idx) => (
        <li key={idx}><b>{it.label}:</b> {it.value}</li>
      ))}
    </ul>
  );
};

const renderIndication = (item, i) => {
  // BD: invitation_details.indications[] (string | { title, text })
  if (!item) return null;
  if (typeof item === 'string') {
    return (
      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        {item}
      </div>
    );
  }
  const title = item.title || 'Indicación';
  const text = item.text || '';
  return (
    <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="font-semibold mb-1">{title}</div>
      {text && <div className="text-slate-700">{text}</div>}
    </div>
  );
};

const Countdown = ({ date, time = '00:00', timeZone = 'America/Bogota' }) => {
  const getTargetMillis = useCallback(() => {
    const dt = DateTime.fromISO(`${date}T${(time || '00:00').slice(0, 5)}`, { zone: timeZone });
    if (!dt.isValid) return null;
    return dt.toUTC().toMillis();
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
        <div
          key={unit}
          className="text-center bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20 w-24"
        >
          <div className="text-4xl md:text-5xl font-bold text-white">
            {String(value).padStart(2, '0')}
          </div>
          <div className="text-xs uppercase text-gray-300 tracking-widest">
            {unit}
          </div>
        </div>
      ))}
    </div>
  );
};

const RsvpForm = ({ onSubmit, eventId }) => {
  const [formData, setFormData] = useState({
    name: '',
    attending: 'yes',
    party_size: 1,
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Nombre requerido", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase
      .from('rsvps')
      .insert({ ...formData, invitation_id: eventId });
    setIsSubmitting(false);
    if (error) {
      toast({
        title: "Error al enviar RSVP",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "¡Gracias por confirmar!",
        description: "Tu asistencia ha sido registrada."
      });
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Tu nombre completo
        </label>
        <input
          type="text"
          placeholder="Tu nombre completo"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
          className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          ¿Asistirás?
        </label>
        <select
          value={formData.attending}
          onChange={(e) =>
            setFormData({ ...formData, attending: e.target.value })
          }
          className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
        >
          <option value="yes">Sí, asistiré</option>
          <option value="no">No podré asistir</option>
        </select>
      </div>
      {formData.attending === 'yes' && (
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">
            Nº de asistentes (incluyéndote)
          </label>
          <input
            type="number"
            min="1"
            placeholder="Nº de asistentes"
            value={formData.party_size}
            onChange={(e) =>
              setFormData({
                ...formData,
                party_size: parseInt(e.target.value) || 1
              })
            }
            className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">
          Mensaje adicional (alergias, etc.)
        </label>
        <textarea
          placeholder="Mensaje adicional"
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
        />
      </div>
      <DialogFooter>
        <Button
          type="submit"
          className="bg-purple-600 hover:bg-purple-700"
          disabled={isSubmitting}
        >
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
  const [modal, setModal] = useState({
    isOpen: false,
    content: null,
    title: ''
  });
  const [songSuggestion, setSongSuggestion] = useState('');
  const [manifest, setManifest] = useState(null);

  const heroRef = useRef(null);
  const location = useLocation();

  // Lee ?d=... y crea un "view" mezclando el draft con el evento real
  const draftParam = useMemo(
    () => new URLSearchParams(location.search).get('d'),
    [location.search]
  );
  const draft = useMemo(() => fromBase64Url(draftParam), [draftParam]);

  // Construcción de "view" (evento + sobrescritura del draft)
  const view = useMemo(() => {
    if (!draft) return event;
    const di = (draft && draft.invitation_details) || draft;

    return {
      ...event,
      // BD: invitation_details (merge no destructivo)
      invitation_details: { ...(event?.invitation_details || {}), ...(di || {}) },
      // BD: sobrescrituras básicas
      event_city: di?.date_block?.city ?? event?.event_city,
      event_timezone: di?.calendar?.timezone ?? event?.event_timezone,
      date: di?.date_block?.date ?? event?.date,
      cover_image_url: di?.hero?.cover_image_url ?? event?.cover_image_url,
      settings: {
        ...(event?.settings || {}),
        design: {
          ...(event?.settings?.design || {}),
          ...(draft?.settings?.design || {})
        }
      }
    };
  }, [event, draft]);

  // Selección de template (prioridad: ?tpl → draft.settings → event.settings)
  const tplKey = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    const tplFromQuery = qp.get('tpl');
    const tplFromDraft = draft?.settings?.design?.template_key;
    const tplFromEvent = event?.settings?.design?.template_key;
    return tplFromQuery || tplFromDraft || tplFromEvent || 'eucalyptus-watercolor';
  }, [location.search, draft, event]);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();
    if (error || !data) {
      toast({ title: "Invitación no encontrada", variant: "destructive" });
      navigate('/');
      return;
    }
    setEvent(data);
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // Aplica variables CSS del template al hero respetando diseño
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

      // BD: cover_image_url: permitir override suave sin romper template
      if (view?.cover_image_url) {
        const url = `url("${view.cover_image_url}")`;
        heroRef.current.style.setProperty('--hero-image', url);
        heroRef.current.style.setProperty('--hero-cover-image', url);
      } else {
        heroRef.current.style.removeProperty('--hero-image');
        heroRef.current.style.removeProperty('--hero-cover-image');
      }

      // Fallback de overlay suave si el template no declara ninguno
      const cs = getComputedStyle(heroRef.current);
      const heroOv = (cs.getPropertyValue('--hero-overlay') || '').trim();
      const galOv = (cs.getPropertyValue('--gallery-hero-overlay') || '').trim();
      if (!heroOv && !galOv) {
        const soft = 'linear-gradient(to bottom, rgba(0,0,0,.25), rgba(0,0,0,.25))';
        heroRef.current.style.setProperty('--hero-overlay', soft);
        heroRef.current.style.setProperty('--gallery-hero-overlay', soft);
      }
    };

    applyAll();

    if (mq.addEventListener) mq.addEventListener('change', applyAll);
    else if (mq.addListener) mq.addListener(applyAll);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', applyAll);
      else if (mq.removeListener) mq.removeListener(applyAll);
      if (heroRef.current) clearTemplateTokens(heroRef.current);
    };
  }, [tplKey, view?.cover_image_url]);

  const handleGuestAccess = (action) => {
    const guestName =
      sessionStorage.getItem('guestName') ||
      prompt('Por favor, ingresa tu nombre para continuar:');
    if (guestName) {
      sessionStorage.setItem('guestName', guestName);
      navigate(`/event/${eventId}/${action}`);
    } else {
      toast({
        title: "Nombre requerido",
        description: "Debes ingresar un nombre para continuar."
      });
    }
  };

  const handleSongSubmit = async (e) => {
    e.preventDefault();
    const guestName = sessionStorage.getItem('guestName') || 'Anónimo';
    const { error } = await supabase
      .from('song_suggestions')
      .insert({
        invitation_id: eventId,
        song_title: songSuggestion,
        guest_name: guestName
      });
    if (error) {
      toast({
        title: "Error al sugerir canción",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "¡Gracias por tu sugerencia!",
        description: "Hemos añadido tu canción a la lista."
      });
      setSongSuggestion('');
      setModal({ isOpen: false, content: null, title: '' });
    }
  };

  const openModal = (type) => {
    const details = (view?.invitation_details) || {};
    let content = null;
    let title = '';
    switch (type) {
      case 'rsvp':
        title = 'Confirmar Asistencia';
        content = (
          <RsvpForm
            eventId={eventId}
            onSubmit={() =>
              setModal({ isOpen: false, content: null, title: '' })
            }
          />
        );
        break;
      case 'gifts':
        title = 'Mesa de Regalos';
        content = (
          <p>{details.gift_info?.message || 'Tu presencia es nuestro mejor regalo.'}</p>
        );
        break;
      case 'songs':
        title = 'Sugiere una Canción';
        content = (
          <form onSubmit={handleSongSubmit} className="space-y-4 text-left">
            <input
              type="text"
              placeholder="Nombre de la canción y artista"
              value={songSuggestion}
              onChange={(e) => setSongSuggestion(e.target.value)}
              required
              className="w-full p-3 rounded bg-white/10 border border-white/20 text-white"
            />
            <DialogFooter>
              <Button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Sugerir Canción
              </Button>
            </DialogFooter>
          </form>
        );
        break;
      default:
        content = null;
    }
    setModal({ isOpen: true, content, title });
  };

  const handleViewOnMap = (loc) => {
    let url;
    if (loc.lat && loc.lng) {
      url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        loc.address || ''
      )}`;
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

  const details = (view?.invitation_details) || {}; // BD: invitation_details

  const Section = ({ children }) => (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className="py-14 px-4"
    >
      {children}
    </motion.section>
  );

  // BD: timezone y fecha/hora para display + countdown
  const tz =
    view?.event_timezone ||
    (details.calendar && details.calendar.timezone) ||
    'America/Bogota';

  const mainTime = details.event_time ?? details.eventTime ?? '';
  const firstLoc = (details.locations && details.locations[0]) || {};

  // Si no hay view.date, intentar desde details.date_block.date
  const eventISODate = view?.date || details?.date_block?.date || '';
  const dateLong = niceDate(eventISODate, tz);
  const timePretty = niceTime(mainTime, tz);
  const fullLocationText = [firstLoc.title, firstLoc.address, view?.event_city]
    .filter(Boolean)
    .join(' — ');
  const addToCalendarEnabled =
    details.calendar && details.calendar.show_add_to_calendar;

  return (
    <div className="min-h-screen bg-slate-900 text-white body-font">
      {/* HERO */}
      <section
        ref={heroRef}
        className="hero-surface relative isolate h-screen flex items-center justify-center text-center overflow-hidden"
      >
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <HeroLayers
            sequence={manifest?.defaults?.animation?.sequence}
            parallaxStrength={
              (manifest &&
                manifest.defaults &&
                manifest.defaults.animation &&
                manifest.defaults.animation.parallax &&
                manifest.defaults.animation.parallax.strength) ||
              8
            }
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="hero-safe relative z-20 p-4 w-full text-white text-theme"
        >
          {/* BD: hosts */}
          <h2 className="text-2xl md:text-4xl font-light tracking-widest mb-4 heading-font">
            {safeArr(details.hosts).length
              ? safeArr(details.hosts).join(' y ')
              : 'Te invitan a'}
          </h2>
          {/* BD: event.title */}
          <h1 className="text-5xl md:text-8xl font-bold mb-6 heading-font">
            {event?.title}
          </h1>
          {/* BD: hero.tagline */}
          {details.hero && details.hero.tagline && (
            <p className="text-lg md:text-xl opacity-90 mb-6">
              {details.hero.tagline}
            </p>
          )}
          {/* BD: countdown (date + time) */}
          {details.countdown && eventISODate && (
            <Countdown
              date={eventISODate}
              time={mainTime || '00:00'}
              timeZone={tz}
            />
          )}
          {/* BD: hero.cta */}
          {details.hero &&
            details.hero.cta_label &&
            details.hero.cta_href && (
              <div className="mt-8">
                <Button
                  size="lg"
                  className="bg-white/10 hover:bg-white/20 border border-white/30 text-white"
                  onClick={() => handleLink(details.hero.cta_href)}
                >
                  {details.hero.cta_label}
                </Button>
              </div>
            )}
        </motion.div>
      </section>

      {/* INFO (fondo claro) */}
      <main className="bg-gradient-to-b from-white to-gray-50 text-slate-900">
        {/* Resumen */}
        <Section>
          <div className="max-w-5xl mx-auto">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold heading-font mb-2">
                    {event?.title}
                  </h2>
                  <p className="text-slate-700">
                    {dateLong}
                    {timePretty ? ` — ${timePretty}` : ''}
                    {tz ? ` (${tz})` : ''}
                  </p>
                  {view?.event_city && (
                    <p className="text-slate-700">{view.event_city}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* BD: dress_code (string | objeto) → badge seguro */}
                  {details.dress_code && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800">
                      <Shirt className="w-4 h-4" />
                      Código de vestuario:{' '}
                      <b>{summarizeDressCode(details.dress_code)}</b>
                    </span>
                  )}
                  {addToCalendarEnabled && (
                    <Button
                      variant="outline"
                      className="border-slate-300"
                      onClick={() =>
                        makeICSAndDownload({
                          title: event?.title,
                          date: eventISODate,
                          time: mainTime || '00:00',
                          tz,
                          locationText: fullLocationText,
                          description:
                            (details.hero && details.hero.tagline) || ''
                        })
                      }
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Guardar fecha
                    </Button>
                  )}
                </div>
              </div>
              {/* BD: invitation_text / welcome_message */}
              {details.invitation_text && (
                <p className="mt-6 text-lg text-slate-700">
                  {details.invitation_text}
                </p>
              )}
              {details.welcome_message && (
                <p className="mt-2 italic text-slate-600">
                  “{details.welcome_message}”
                </p>
              )}
            </div>
          </div>
        </Section>

        {/* Agenda / Lugares */}
        {safeArr(details.locations).length > 0 && (
          <Section>
            <div className="max-w-5xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 heading-font">
                Agenda del Evento
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {safeArr(details.locations).map((loc, i) => {
                  const hhmm = String(loc?.time || '').slice(0, 5);
                  const timeFmt = hhmm ? niceTime(hhmm, tz) : null;
                  return (
                    <div
                      key={i}
                      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <h4 className="text-xl font-semibold heading-font">
                          {loc?.title || 'Lugar'}
                        </h4>
                      </div>
                      <p className="text-slate-700 mb-1 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {timeFmt || 'Hora por confirmar'}
                        {tz ? ` (${tz})` : ''}
                      </p>
                      {loc?.address && (
                        <p className="text-slate-700 mb-4">
                          {loc.address}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        className="border-slate-300"
                        onClick={() => handleViewOnMap(loc || {})}
                      >
                        Ver en mapa
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        )}

        {/* Indicaciones */}
        {safeArr(details.indications).filter(Boolean).length > 0 && (
          <Section>
            <div className="max-w-4xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 heading-font">
                Indicaciones
              </h3>
              <div className="space-y-3">
                {safeArr(details.indications)
                  .filter(Boolean)
                  .map((item, i) => renderIndication(item, i))}
              </div>
            </div>
          </Section>
        )}

        {/* Información útil (incluye políticas y, si aplica, dress_code detallado) */}
        {(details.policy &&
          (details.policy.children_policy ||
            details.policy.plus_one ||
            details.policy.photos_policy ||
            details.policy.parking_info)) || details.dress_code ? (
          <Section>
            <div className="max-w-5xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-6 heading-font">
                Información útil
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {details.policy?.children_policy && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <Baby className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-semibold heading-font">
                        Política de niños
                      </h4>
                    </div>
                    <p className="text-slate-700">
                      {typeof details.policy.children_policy === 'string'
                        ? details.policy.children_policy
                        : ''}
                    </p>
                  </div>
                )}
                {details.policy?.plus_one && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <Users className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-semibold heading-font">
                        Acompañantes
                      </h4>
                    </div>
                    <p className="text-slate-700">
                      {typeof details.policy.plus_one === 'string'
                        ? details.policy.plus_one
                        : ''}
                    </p>
                  </div>
                )}
                {details.policy?.photos_policy && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <Camera className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-semibold heading-font">
                        Política de fotos
                      </h4>
                    </div>
                    <p className="text-slate-700">
                      {typeof details.policy.photos_policy === 'string'
                        ? details.policy.photos_policy
                        : ''}
                    </p>
                  </div>
                )}
                {details.policy?.parking_info && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <ParkingSquare className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-semibold heading-font">
                        Parqueadero
                      </h4>
                    </div>
                    <p className="text-slate-700">
                      {typeof details.policy.parking_info === 'string'
                        ? details.policy.parking_info
                        : ''}
                    </p>
                  </div>
                )}

                {/* Card opcional: Código de vestuario detallado */}
                {details.dress_code && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <Shirt className="w-5 h-5" />
                      </div>
                      <h4 className="text-xl font-semibold heading-font">
                        Código de vestuario
                      </h4>
                    </div>
                    <DressCodeList dc={details.dress_code} />
                  </div>
                )}
              </div>
            </div>
          </Section>
        ) : null}

        {/* Menú / Alergias */}
        {details.menu &&
          Array.isArray(details.menu.allergies) &&
          details.menu.allergies.length > 0 && (
            <Section>
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold mb-4 heading-font flex items-center gap-2">
                  <UtensilsCrossed className="w-6 h-6" /> Menú y alergias
                </h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <p className="text-slate-700 mb-3">
                    Por favor, avísanos si tienes alguna de las siguientes
                    alergias o restricciones:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {details.menu.allergies.map((a, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800"
                      >
                        {typeof a === 'string' ? a : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

        {/* Regalos */}
        {(details.gift_info &&
          (details.gift_info.message ||
            safeArr(details.gift_info.registry).length > 0)) && (
            <Section>
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold mb-6 heading-font flex items-center gap-2">
                  <Gift className="w-6 h-6" /> Mesa de regalos
                </h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  {details.gift_info.message && (
                    <p className="text-slate-700 mb-4">
                      {details.gift_info.message}
                    </p>
                  )}
                  {safeArr(details.gift_info.registry).length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {safeArr(details.gift_info.registry).map((r, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          className="border-slate-300"
                          onClick={() => handleLink(r?.url)}
                        >
                          {r?.label || 'Registro'}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Section>
          )}

        {/* Transporte y Hoteles */}
        {((details.travel && safeArr(details.travel.transport).length > 0) ||
          (details.travel && safeArr(details.travel.hotels).length > 0)) && (
            <Section>
              <div className="max-w-5xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-6">
                  {details.travel &&
                    safeArr(details.travel.transport).length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-2xl font-bold mb-4 heading-font flex items-center gap-2">
                          <Bus className="w-6 h-6" /> Transporte
                        </h3>
                        <div className="space-y-4">
                          {safeArr(details.travel.transport).map((t, i) => (
                            <div
                              key={i}
                              className="border border-slate-200 rounded-xl p-4"
                            >
                              <div className="font-semibold">
                                {t?.route || 'Servicio'}
                              </div>
                              {t?.schedule && (
                                <div className="text-slate-700">
                                  Horario: {t.schedule}
                                </div>
                              )}
                              {t?.notes && (
                                <div className="text-slate-600 text-sm">
                                  {t.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {details.travel &&
                    safeArr(details.travel.hotels).length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-2xl font-bold mb-4 heading-font flex items-center gap-2">
                          <Hotel className="w-6 h-6" /> Hospedaje recomendado
                        </h3>
                        <div className="space-y-4">
                          {safeArr(details.travel.hotels).map((h, i) => (
                            <div
                              key={i}
                              className="border border-slate-200 rounded-xl p-4"
                            >
                              <div className="font-semibold">
                                {h?.name || 'Hotel'}
                              </div>
                              {h?.address && (
                                <div className="text-slate-700">
                                  {h.address}
                                </div>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2">
                                {h?.phone && (
                                  <Button
                                    variant="outline"
                                    className="border-slate-300"
                                    onClick={() =>
                                      handleLink(
                                        `tel:${cleanPhone(h.phone)}`
                                      )
                                    }
                                  >
                                    <Phone className="w-4 h-4 mr-2" /> Llamar
                                  </Button>
                                )}
                                {h?.url && (
                                  <Button
                                    variant="outline"
                                    className="border-slate-300"
                                    onClick={() => handleLink(h.url)}
                                  >
                                    Abrir sitio
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </Section>
          )}

        {/* Redes / Hashtag */}
        {details.social &&
          (details.social.hashtag ||
            details.social.instagram ||
            details.social.tiktok ||
            details.social.twitter) && (
            <Section>
              <div className="max-w-4xl mx-auto">
                <h3 className="text-2xl md:text-3xl font-bold mb-6 heading-font">
                  Comparte con nosotros
                </h3>
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center gap-3">
                  {details.social.hashtag && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800">
                      <Hash className="w-4 h-4" /> {details.social.hashtag}
                    </span>
                  )}
                  {details.social.instagram && (
                    <Button
                      variant="outline"
                      className="border-slate-300"
                      onClick={() =>
                        handleLink(
                          `https://instagram.com/${details.social.instagram.replace(
                            '@',
                            ''
                          )}`
                        )
                      }
                    >
                      <Instagram className="w-4 h-4 mr-2" />{' '}
                      {details.social.instagram}
                    </Button>
                  )}
                  {details.social.tiktok && (
                    <Button
                      variant="outline"
                      className="border-slate-300"
                      onClick={() =>
                        handleLink(
                          `https://tiktok.com/@${details.social.tiktok.replace(
                            '@',
                            ''
                          )}`
                        )
                      }
                    >
                      TikTok {details.social.tiktok}
                    </Button>
                  )}
                  {details.social.twitter && (
                    <Button
                      variant="outline"
                      className="border-slate-300"
                      onClick={() =>
                        handleLink(
                          `https://x.com/${details.social.twitter.replace(
                            '@',
                            ''
                          )}`
                        )
                      }
                    >
                      X/Twitter {details.social.twitter}
                    </Button>
                  )}
                </div>
              </div>
            </Section>
          )}

        {/* Contactos / RSVP info */}
        {((details.contacts && details.contacts.length > 0) ||
          (details.rsvp &&
            (details.rsvp.deadline || details.rsvp.contact))) && (
            <Section>
              <div className="max-w-5xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
                    <div>
                      <h3 className="text-2xl font-bold heading-font mb-1">
                        Confirma tu asistencia
                      </h3>
                      {details.rsvp && details.rsvp.deadline && (
                        <p className="text-slate-700">
                          Fecha límite:{' '}
                          {niceDate(details.rsvp.deadline, tz)}
                        </p>
                      )}
                      {details.rsvp && details.rsvp.contact && (
                        <p className="text-slate-700 text-sm">
                          Contacto: {details.rsvp.contact.name}{' '}
                          {details.rsvp.contact.phone
                            ? `— ${details.rsvp.contact.phone}`
                            : ''}
                        </p>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg px-8 py-6 rounded-xl"
                      onClick={() => openModal('rsvp')}
                    >
                      <Users className="w-5 h-5 mr-2" /> RSVP
                    </Button>
                  </div>

                  {details.contacts && details.contacts.length > 0 && (
                    <>
                      <h4 className="text-lg font-semibold mb-3">
                        Contactos útiles
                      </h4>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {details.contacts.map((c, i) => (
                          <div
                            key={i}
                            className="border border-slate-200 rounded-xl p-4"
                          >
                            <div className="font-semibold">
                              {c?.name}
                            </div>
                            {c?.role && (
                              <div className="text-slate-600 text-sm mb-2">
                                {c.role}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2">
                              {c?.phone && (
                                <Button
                                  variant="outline"
                                  className="border-slate-300"
                                  onClick={() =>
                                    handleLink(
                                      `tel:${cleanPhone(c.phone)}`
                                    )
                                  }
                                >
                                  <Phone className="w-4 h-4 mr-2" /> Llamar
                                </Button>
                              )}
                              {c?.whatsapp && (
                                <Button
                                  variant="outline"
                                  className="border-slate-300"
                                  onClick={() =>
                                    handleLink(
                                      `https://wa.me/${cleanPhone(
                                        c.whatsapp
                                      )}`
                                    )
                                  }
                                >
                                  WhatsApp
                                </Button>
                              )}
                              {c?.email && (
                                <Button
                                  variant="outline"
                                  className="border-slate-300"
                                  onClick={() =>
                                    handleLink(`mailto:${c.email}`)
                                  }
                                >
                                  Email
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Section>
          )}

        {/* Música */}
        {details.songs &&
          (details.songs.allow_suggestions ||
            details.songs.playlist_url) && (
            <Section>
              <div className="max-w-4xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-2xl font-bold mb-4 heading-font flex items-center gap-2">
                    <Music className="w-6 h-6" /> Música
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {details.songs.playlist_url && (
                      <Button
                        variant="outline"
                        className="border-slate-300"
                        onClick={() => handleLink(details.songs.playlist_url)}
                      >
                        Abrir playlist
                      </Button>
                    )}
                    {details.songs.allow_suggestions && (
                      <Button
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => openModal('songs')}
                      >
                        Sugerir canción
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Section>
          )}

        {/* CTA finales */}
        <Section>
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActionButton
              icon={<Camera />}
              title="Sube tus Fotos"
              onClick={() => handleGuestAccess('upload')}
            />
            <ActionButton
              icon={<MessageSquare />}
              title="Libro de Visitas"
              onClick={() => handleGuestAccess('guestbook')}
            />
            <ActionButton
              icon={<Gift />}
              title="Mesa de Regalos"
              onClick={() => openModal('gifts')}
            />
            {addToCalendarEnabled ? (
              <ActionButton
                icon={<Calendar />}
                title="Guardar Fecha"
                onClick={() =>
                  makeICSAndDownload({
                    title: event?.title,
                    date: eventISODate,
                    time: mainTime || '00:00',
                    tz,
                    locationText: fullLocationText,
                    description:
                      (details.hero && details.hero.tagline) || ''
                  })
                }
              />
            ) : (
              <ActionButton
                icon={<Calendar />}
                title="Guardar Fecha"
                onClick={() =>
                  toast({ title: "Funcionalidad no implementada" })
                }
              />
            )}
            <ActionButton
              icon={<Users />}
              title="Ver Invitados"
              onClick={() =>
                toast({ title: "Funcionalidad no implementada" })
              }
            />
          </div>
        </Section>
      </main>

      <Dialog
        open={modal.isOpen}
        onOpenChange={(isOpen) =>
          setModal((prev) => ({ ...prev, isOpen }))
        }
      >
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-purple-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl heading-font">
              {modal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">{modal.content}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ActionButton = ({ icon, title, onClick }) => (
  <motion.div
    whileHover={{ y: -5, scale: 1.03 }}
    className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-center cursor-pointer"
    onClick={onClick}
  >
    <div className="mb-3 inline-block">
      {React.cloneElement(icon, { className: "w-8 h-8" })}
    </div>
    <h3 className="font-semibold text-slate-900 text-lg heading-font">
      {title}
    </h3>
  </motion.div>
);

export default InvitationPage;
