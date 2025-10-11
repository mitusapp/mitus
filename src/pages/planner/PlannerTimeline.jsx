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
  observations: '',
  location: '',
  assignee_team_id: '',
  provider_ids: [],
  internal_notes: '',
};

// Etiquetas del tipo de evento (como en Providers/Profile)
const EVENT_TYPE_LABELS = {
  boda: 'Boda',
  quince: 'Quince Años',
  cumpleanos: 'Cumpleaños',
  corporativo: 'Corporativo',
  babyshower: 'Baby Shower',
  aniversario: 'Aniversario',
  otro: 'Otro Evento',
};

// Utilidades de fecha/hora
const tzOffset = '-05:00';
const toISOWithTZ = (dateYmd, timeHm = '00:00') => {
  if (!dateYmd) return null;
  const hm = /:\\d{2}$/.test(timeHm) ? timeHm : `${timeHm}:00`;
  return `${dateYmd}T${hm}${tzOffset}`;
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

  // Encabezado y fecha
  const [eventHeader, setEventHeader] = useState('');
  const [eventDateStr, setEventDateStr] = useState('');

  // Búsqueda libre
  const [query, setQuery] = useState('');

  const toYMD = (d) => {
    if (!d) return '';
    const date = new Date(String(d).replace(/-/g, '/'));
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  const timeToHM = (t) => {
    if (!t) return '';
    const s = String(t);
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : '';
  };
  const formatShortEsDate = (d) => {
    if (!d) return '';
    const date = new Date(String(d).replace(/-/g, '/'));
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const loadEventHeader = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, event_type, event_type_label, invitation_details')
        .eq('id', eventId)
        .single();
      if (error) throw error;

      const hostsArr = data?.invitation_details?.hosts;
      const hosts = Array.isArray(hostsArr) && hostsArr.length ? hostsArr.join(' y ') : (data?.title || '');
      const typeLabel = EVENT_TYPE_LABELS[data?.event_type] || data?.event_type_label || 'Evento';
      const rawDate = data?.date;
      const header = `${typeLabel}${hosts ? ` de ${hosts}` : ''}${rawDate ? ` – ${formatShortEsDate(rawDate)}` : ''}`;

      setEventHeader(header);
      setEventDateStr(rawDate ? toYMD(rawDate) : '');
    } catch (e) {
      setEventHeader('');
      setEventDateStr('');
    }
  }, [eventId]);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planner_timeline_items')
        .select('*')
        .eq('event_id', eventId)
        .order('start_date', { ascending: true, nullsFirst: true })
        .order('start_time', { ascending: true, nullsFirst: true });
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
        .select('id, name')
        .eq('event_id', eventId)
        .order('name', { ascending: true });
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

  const openCreate = () => {
    setForm({
      ...emptyForm,
      date_start: eventDateStr || '',
      date_end: eventDateStr || '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (item) => {
    const legacyStartTs = item.start_ts || item.start_time;
    const legacyEndTs = item.end_ts || item.end_time;

    const derivedStartDate = item.start_date || (legacyStartTs ? toYMD(legacyStartTs) : (eventDateStr || ''));
    const derivedStartTime = item.start_time ? timeToHM(item.start_time) : (legacyStartTs ? timeToHM(new Date(legacyStartTs).toISOString().slice(11, 16)) : '');
    const derivedEndDate = item.end_date || (legacyEndTs ? toYMD(legacyEndTs) : (eventDateStr || ''));
    const derivedEndTime = item.end_time ? timeToHM(item.end_time) : (legacyEndTs ? timeToHM(new Date(legacyEndTs).toISOString().slice(11, 16)) : '');

    setForm({
      id: item.id,
      title: item.title || '',
      date_start: derivedStartDate,
      time_start: derivedStartTime,
      date_end: derivedEndDate,
      time_end: derivedEndTime,
      category: item.category || 'other',
      subject: item.subject || '',
      description: item.description || '',
      observations: item.observations || '',
      location: item.location || '',
      assignee_team_id: item.assignee_team_id || '',
      provider_ids: item.provider_ids || [],
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

  // Util local sin redeclarar tzOffset
  const toISOWithTZLocal = (dateYmd, timeHm = '00:00') => {
    if (!dateYmd) return null;
    const hm = /:\\d{2}$/.test(timeHm) ? timeHm : `${timeHm}:00`;
    return `${dateYmd}T${hm}${tzOffset}`;
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const start_date = payload.date_start || null;
      const end_date = payload.date_end || payload.date_start || null;
      const start_time = payload.time_start || null;
      const end_time = payload.time_end || null;

      const start_ts = start_date ? toISOWithTZLocal(start_date, start_time || '00:00') : null;
      const end_ts = end_date && end_time ? toISOWithTZLocal(end_date, end_time) : null;

      const body = {
        event_id: eventId,
        title: payload.title,
        start_date,
        end_date,
        start_time,
        end_time,
        start_ts,
        end_ts,
        category: payload.category || 'other',
        subject: payload.subject || null,
        description: payload.description || null,
        observations: payload.observations || null,
        location: payload.location || null,
        assignee_team_id: payload.assignee_team_id || null,
        provider_ids: (payload.provider_ids && payload.provider_ids.length) ? payload.provider_ids : null,
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

  // ---- Solo búsqueda libre (filtros ahora viven en TimelineList) ----
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items || [];

    const memberMap = new Map();
    (teamMembers || []).forEach((m) => memberMap.set(m.id, (m.name || '').toLowerCase()));

    return (items || []).filter((it) => {
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
    <div className="p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/10 mr-3"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Cronograma / Run of Show</h1>
              {eventHeader && (
                <p className="text-xs sm:text-sm text-gray-300 mt-0.5 break-words">{eventHeader}</p>
              )}
            </div>
          </div>
          <Button onClick={openCreate} className="bg-purple-600 hover:bg-purple-500">
            <Plus className="w-4 h-4 mr-1" /> Nuevo hito
          </Button>
        </div>

        {/* Búsqueda libre */}
        <div className="relative mb-3 mt-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400 text-white"
            placeholder="Buscar por título, categoría, sujeto, responsable, proveedor, ubicación…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Filtros por propiedad ahora viven dentro de TimelineList (misma barra que Exportar PDF) */}
        <TimelineList
          items={filtered}
          loading={loading}
          onEdit={openEdit}
          onDelete={handleDelete}
          labelFromServiceType={labelFromServiceType}
          labelFromSubject={labelFromSubject}
          teamMembers={teamMembers}
          providersMap={providersMap}
          eventHeader={eventHeader}
        />

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
        />
      </motion.div>
    </div>
  );
};

export default PlannerTimeline;
