import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

import TimelineList from '@/components/planner/TimelineList.jsx';
import TimelineFormModal from '@/components/planner/TimelineFormModal.jsx';

const SERVICE_TYPES = [
  { value: 'wedding_planner', label: 'Organizador/a de bodas' },
  { value: 'photography', label: 'Fotografía' },
  { value: 'video', label: 'Video' },
  { value: 'photo_video', label: 'Foto y Video' },
  { value: 'music_dj', label: 'Música / DJ' },
  { value: 'live_band', label: 'Banda en vivo' },
  { value: 'mc_animacion', label: 'Maestro de ceremonia / Animación' },
  { value: 'lighting_sound', label: 'Luces y sonido' },
  { value: 'florist', label: 'Flores / Floristería' },
  { value: 'decor_rentals', label: 'Decoración / Alquileres' },
  { value: 'catering', label: 'Catering / Banquete' },
  { value: 'cake_desserts', label: 'Torta y Postres' },
  { value: 'bar_beverages', label: 'Bar y Bebidas' },
  { value: 'beauty', label: 'Maquillaje y peinado' },
  { value: 'attire', label: 'Vestuario y accesorios' },
  { value: 'officiant', label: 'Oficiante' },
  { value: 'transport', label: 'Transporte' },
  { value: 'security', label: 'Seguridad' },
  { value: 'kids_babysitting', label: 'Niñera / Zona infantil' },
  { value: 'venue', label: 'Lugar / Venue' },
  { value: 'invitations', label: 'Invitaciones / Papelería' },
  { value: 'photobooth', label: 'Cabina de fotos' },
  { value: 'fireworks', label: 'Pirotecnia' },
  { value: 'av_production', label: 'Producción / A.V.' },
  { value: 'other', label: 'Otro' },
];

const SUBJECTS = [
  { value: 'bride', label: 'Novia' },
  { value: 'groom', label: 'Novio' },
  { value: 'quinceanera', label: 'Quinceañera' },
  { value: 'bride_mother', label: 'Mamá de la novia' },
  { value: 'groom_mother', label: 'Mamá del novio' },
  { value: 'quince_mother', label: 'Mamá de la quinceañera' },
  { value: 'bride_father', label: 'Papá de la novia' },
  { value: 'groom_father', label: 'Papá del novio' },
  { value: 'quince_father', label: 'Papá de la quinceañera' },
  { value: 'couple', label: 'Novios' },
  { value: 'family', label: 'Familia' },
  { value: 'guests', label: 'Invitados' },
];

const labelFromServiceType = (value) => SERVICE_TYPES.find((s) => s.value === value)?.label || null;
const labelFromSubject = (value) => SUBJECTS.find((s) => s.value === value)?.label || null;

const emptyForm = {
  id: null,
  title: '',
  date_start: '', // YYYY-MM-DD
  time_start: '', // HH:MM
  date_end: '',   // YYYY-MM-DD
  time_end: '',   // HH:MM
  category: 'other',
  subject: '',
  description: '',
  location: '',
  assignee_team_id: '',
  provider_ids: [],
  av_cues: '',
  internal_notes: '',
};

const PlannerTimeline = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [teamMembers, setTeamMembers] = useState([]);
  const [eventProviders, setEventProviders] = useState([]);
  const [providersMap, setProvidersMap] = useState(new Map());

  // Header + fecha
  const [eventHeader, setEventHeader] = useState({ title: '', subtitle: '' });
  const [eventDateStr, setEventDateStr] = useState(''); // YYYY-MM-DD

  const [query, setQuery] = useState('');

  const toYMD = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const toHM = (d) => {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const combine = (ymd, hm) => {
    if (!ymd) return null;
    const t = hm || '00:00';
    // new Date('YYYY-MM-DDTHH:mm') toma hora local
    return new Date(`${ymd}T${t}`);
  };

  // Cargar evento: tipo + anfitriones + fecha
  const loadEventHeader = useCallback(async () => {
    try {
      const { data: ev, error } = await supabase
        .from('events')
        .select('id, name, title, event_type, date, event_date, start_date, hosts')
        .eq('id', eventId)
        .single();
    if (error) throw error;

      const type = ev?.event_type || 'Evento';
      const hostsArr = Array.isArray(ev?.hosts) ? ev.hosts : [];
      const hosts = hostsArr
        .map((h) => (typeof h === 'string' ? h : (h?.full_name || h?.name)))
        .filter(Boolean)
        .join(' y ');
      const rawDate = ev?.event_date || ev?.date || ev?.start_date;
      const eventDate = rawDate ? new Date(rawDate) : null;
      const fmt = eventDate ? eventDate.toLocaleDateString('es-ES') : '';
      const title = `${type}${hosts ? ` de ${hosts}` : ''}${fmt ? ` — ${fmt}` : ''}`;

      setEventHeader({ title, subtitle: ev?.name || ev?.title || '' });
      setEventDateStr(eventDate ? toYMD(eventDate) : '');
    } catch (_) {
      setEventHeader({ title: 'Cronograma', subtitle: '' });
      setEventDateStr('');
    }
  }, [eventId]);

  // Data
  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planner_timeline_items')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      toast({ title: 'Error al cargar cronograma', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const loadTeamMembers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('planner_team')
        .select('id, display_name, name')
        .eq('event_id', eventId)
        .order('display_name', { ascending: true });
      if (error) throw error;
      setTeamMembers(data || []);
    } catch {
      setTeamMembers([]);
    }
  }, [eventId]);

  const loadEventProviders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_providers')
        .select('provider_id, planner_providers(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEventProviders(data || []);
      const m = new Map();
      (data || []).forEach((r) => {
        const p = r.planner_providers || {};
        m.set(r.provider_id, { name: p.name || '—', service_type: p.service_type || '' });
      });
      setProvidersMap(m);
    } catch {
      setEventProviders([]);
      setProvidersMap(new Map());
    }
  }, [eventId]);

  useEffect(() => {
    loadEventHeader();
    loadTimeline();
    loadTeamMembers();
    loadEventProviders();
  }, [loadEventHeader, loadTimeline, loadTeamMembers, loadEventProviders]);

  // Abrir crear con fecha default del evento
  const openCreate = () => {
    setForm({
      ...emptyForm,
      date_start: eventDateStr || '',
      date_end: eventDateStr || '',
    });
    setIsModalOpen(true);
  };

  // Abrir edición parseando timestamps guardados
  const openEdit = (item) => {
    setForm({
      id: item.id,
      title: item.title || '',
      date_start: item.start_time ? toYMD(item.start_time) : (eventDateStr || ''),
      time_start: item.start_time ? toHM(item.start_time) : '',
      date_end: item.end_time ? toYMD(item.end_time) : (eventDateStr || ''),
      time_end: item.end_time ? toHM(item.end_time) : '',
      category: item.category || 'other',
      subject: item.subject || '',
      description: item.description || '',
      location: item.location || '',
      assignee_team_id: item.assignee_team_id || '',
      provider_ids: item.provider_ids || [],
      av_cues: item.av_cues || '',
      internal_notes: item.internal_notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este hito?')) return;
    try {
      const { error } = await supabase.from('planner_timeline_items').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Hito eliminado' });
      await loadTimeline();
    } catch (e) {
      toast({ title: 'No se pudo eliminar', description: e.message, variant: 'destructive' });
    }
  };

  // Combinar fecha/hora → ISO antes de guardar
  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const startDT = combine(payload.date_start, payload.time_start);
      const endDT   = (payload.date_end || payload.time_end) ? combine(payload.date_end || payload.date_start, payload.time_end) : null;

      const body = {
        event_id: eventId,
        title: payload.title,
        start_time: startDT ? startDT.toISOString() : null,
        end_time: endDT ? endDT.toISOString() : null,
        category: payload.category || 'other',
        subject: payload.subject || null,
        description: payload.description || null,
        location: payload.location || null,
        assignee_team_id: payload.assignee_team_id || null,
        provider_ids: (payload.provider_ids && payload.provider_ids.length) ? payload.provider_ids : null,
        av_cues: payload.av_cues || null,
        internal_notes: payload.internal_notes || null,
      };

      if (payload.id) {
        const { error } = await supabase
          .from('planner_timeline_items')
          .update(body)
          .eq('id', payload.id)
          .eq('event_id', eventId);
        if (error) throw error;
        toast({ title: 'Hito actualizado' });
      } else {
        const { error } = await supabase.from('planner_timeline_items').insert([body]);
        if (error) throw error;
        toast({ title: 'Hito creado' });
      }

      setIsModalOpen(false);
      await loadTimeline();
    } catch (e) {
      toast({ title: 'Error al guardar hito', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Buscador (incluye categoría/sujeto por label)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    const memberMap = new Map();
    teamMembers.forEach((m) => memberMap.set(m.id, (m.display_name || m.name || '').toLowerCase()));

    return items.filter((it) => {
      const catLabel = (labelFromServiceType(it.category) || '').toLowerCase();
      const subjLabel = (labelFromSubject(it.subject) || '').toLowerCase();
      const resp = it.assignee_team_id ? (memberMap.get(it.assignee_team_id) || '') : '';
      const provs = (it.provider_ids || [])
        .map((id) => providersMap.get(id)?.name?.toLowerCase())
        .filter(Boolean)
        .join(' ');
      const haystack = `${it.title || ''} ${it.description || ''} ${it.location || ''} ${catLabel} ${subjLabel} ${resp} ${provs}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, teamMembers, providersMap]);

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate(`/host/${eventId}/planner`)}
                className="text-white hover:bg-white/10"
                title="Volver"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">
                  {eventHeader.title || 'Cronograma / Run of Show'}
                </h1>
                {eventHeader.subtitle && (
                  <p className="text-xs text-gray-300">{eventHeader.subtitle}</p>
                )}
              </div>
            </div>
            <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-500">
              <Plus className="w-4 h-4 mr-2" /> Nuevo hito
            </Button>
          </div>

          {/* Buscador */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400 text-white"
              placeholder="Buscar por título, categoría, sujeto, responsable, proveedor, ubicación…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Lista */}
          <TimelineList
            items={filtered}
            loading={loading}
            onEdit={openEdit}
            onDelete={handleDelete}
            labelFromServiceType={labelFromServiceType}
            labelFromSubject={labelFromSubject}
            teamMembers={teamMembers}
            providersMap={providersMap}
          />

          {/* Modal */}
          <TimelineFormModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            saving={saving}
            form={form}
            setForm={setForm}
            onSubmit={handleSubmit}
            serviceTypes={SERVICE_TYPES}
            subjects={SUBJECTS}
            teamMembers={teamMembers}
            eventProviders={eventProviders}
            labelFromServiceType={labelFromServiceType}
          />
        </motion.div>
      </div>
    </div>
  );
};

export default PlannerTimeline;
