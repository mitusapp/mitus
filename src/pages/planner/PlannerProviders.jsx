// src/pages/planner/PlannerProviders.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

import ProvidersList from '../../components/planner/ProvidersList.jsx';
import ProviderFormModal from '../../components/planner/ProviderFormModal.jsx';

// NEW: categorías globales (Padre › Hija)
import { useCategories } from '@/features/categories/useCategories';

// NEW: modal para seleccionar y vincular proveedores globales
import ProviderPickerModal from '@/components/planner/ProviderPickerModal';

// NEW: reutilizamos el modal global con todos los campos
import ContactsFormModal from '@/components/profile/ContactsFormModal';

// NEW: modal de vista detallada
import ProviderViewModal from '@/components/profile/ProviderViewModal';

/** Catálogo normalizado: service_type → etiqueta visible (enfocado en eventos sociales) */
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

/** Estado por evento (se muestra en español) */
const EVENT_STATUS = [
  { value: 'tentative', label: 'Tentativo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'quoted', label: 'Cotizado' },
  { value: 'booked', label: 'Reservado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

/** util */
const labelFromServiceType = (value) =>
  SERVICE_TYPES.find((s) => s.value === value)?.label || null;
const labelFromEventStatus = (value) =>
  EVENT_STATUS.find((s) => s.value === value)?.label || value;

// Etiquetas del tipo de evento (como en ProfilePage.jsx)
const EVENT_TYPE_LABELS = {
  boda: 'Boda',
  quince: 'Quince Años',
  cumpleanos: 'Cumpleaños',
  corporativo: 'Corporativo',
  babyshower: 'Baby Shower',
  aniversario: 'Aniversario',
  otro: 'Otro Evento',
};

/** formulario base */
const emptyForm = {
  id: null,
  name: '',
  category_id: null,           // nueva taxonomía
  service_type: 'other',       // legacy compat (no se escribe a DB)
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  instagram: '',
  notes: '',
  location: '',
  about: '',
  bank_details: '',
  event_status: 'tentative',   // por evento
};

const PlannerProviders = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { byId: categoriesById } = useCategories();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);            // legacy (sigue presente, no se usa para editar desde lista)
  const [form, setForm] = useState(emptyForm);

  const [rows, setRows] = useState([]);
  const [myProviders, setMyProviders] = useState([]);

  // Picker + ContactsForm
  const [openPicker, setOpenPicker] = useState(false);
  const [openContactsForm, setOpenContactsForm] = useState(false);

  // View modal
  const [openView, setOpenView] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  // Encabezado del evento
  const [eventHeader, setEventHeader] = useState('');

  const formatShortEsDate = (d) => {
    if (!d) return '';
    const date = new Date(String(d).replace(/-/g, '/'));
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const fetchEventInfo = useCallback(async () => {
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
      const dateLabel = formatShortEsDate(data?.date);

      const header = `${typeLabel}${hosts ? ` de ${hosts}` : ''}${dateLabel ? ` – ${dateLabel}` : ''}`;
      setEventHeader(header);
    } catch {
      setEventHeader('');
    }
  }, [eventId]);

  const loadProviders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: eventProviders, error: epErr } = await supabase
        .from('event_providers')
        .select('provider_id, created_at, status, planner_providers(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (epErr) throw epErr;
      setRows(eventProviders || []);

      const { data: mine, error: myErr } = await supabase
        .from('planner_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (myErr) throw myErr;
      setMyProviders(mine || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al cargar proveedores', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, eventId]);

  useEffect(() => { fetchEventInfo(); }, [fetchEventInfo]);
  useEffect(() => { loadProviders(); }, [loadProviders]);

  const norm = (s) =>
    String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return rows;
    return rows.filter((r) => {
      const p = r.planner_providers || {};
      let categoryLabel = '';
      if (p.category_id && categoriesById[p.category_id]) {
        const cat = categoriesById[p.category_id];
        const parent = cat?.parent_id ? categoriesById[cat.parent_id] : null;
        categoryLabel = parent ? `${parent.name} ${cat.name}` : cat.name;
      } else {
        categoryLabel = labelFromServiceType(p.service_type) || '';
      }
      const haystack = norm(
        `${p.name ?? ''} ${p.service_type ?? ''} ${categoryLabel} ${p.contact_name ?? ''} ${p.email ?? ''} ${p.phone ?? ''} ${p.instagram ?? ''} ${p.website ?? ''} ${p.location ?? ''} ${r.status ?? ''}`
      );
      return haystack.includes(q);
    });
  }, [rows, query, categoriesById]);

  // Abrir picker para agregar proveedores (seleccionar o crear)
  const openCreate = () => {
    setForm(emptyForm);
    setOpenPicker(true);
  };

  // EDITAR: ahora abre ContactsFormModal (no ProviderFormModal)
  const openEdit = (row) => {
    const p = row?.planner_providers || {};
    setForm({
      id: p.id,
      name: p.name || '',
      category_id: p.category_id || null,
      service_type: p.service_type || 'other', // compat
      contact_name: p.contact_name || '',
      email: p.email || '',
      phone: p.phone || '',
      website: p.website || '',
      instagram: p.instagram || '',
      notes: p.notes || '',
      location: p.location || '',
      about: p.about || '',
      bank_details: p.bank_details || '',
      event_status: row.status || 'tentative',
    });
    setOpenContactsForm(true);
  };

  // VER: abre ProviderViewModal
  const handleView = (row) => {
    setViewRow(row);
    setOpenView(true);
  };

  // Cambiar estado inline (picker en tabla)
  const handleStatusChange = async (provider_id, newStatus) => {
    try {
      const { error } = await supabase
        .from('event_providers')
        .update({ status: newStatus })
        .eq('event_id', eventId)
        .eq('provider_id', provider_id);
      if (error) throw error;
      toast({ title: 'Estado actualizado' });
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo actualizar el estado', description: e.message, variant: 'destructive' });
    }
  };

  // Guardar (legacy modal del planner) — se mantiene por compat, no se usa al editar desde lista
  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const event_status = payload.event_status || 'tentative';

      if (payload._linkOnly && payload.id) {
        const { error: linkErr } = await supabase
          .from('event_providers')
          .insert([{ event_id: eventId, provider_id: payload.id, status: event_status }]);
        if (linkErr && linkErr.code !== '23505') throw linkErr;
        if (linkErr && linkErr.code === '23505') {
          await supabase
            .from('event_providers')
            .update({ status: event_status })
            .eq('event_id', eventId)
            .eq('provider_id', payload.id);
        }
        toast({ title: 'Proveedor vinculado al evento' });
        setOpenForm(false);
        await loadProviders();
        return;
      }

      let providerId = payload.id;
      if (providerId) {
        const { error: updErr } = await supabase
          .from('planner_providers')
          .update({
            name: payload.name,
            category_id: payload.category_id || null,
            contact_name: payload.contact_name || null,
            email: payload.email || null,
            phone: payload.phone || null,
            website: payload.website || null,
            instagram: payload.instagram?.replace(/^@/, '') || null,
            notes: payload.notes || null,
            location: payload.location || null,
            about: payload.about || null,
            bank_details: payload.bank_details || null,
          })
          .eq('id', providerId)
          .eq('user_id', user.id);
        if (updErr) throw updErr;
      } else {
        const { data: created, error: createErr } = await supabase
          .from('planner_providers')
          .insert([{
            user_id: user.id,
            name: payload.name,
            category_id: payload.category_id || null,
            contact_name: payload.contact_name || null,
            email: payload.email || null,
            phone: payload.phone || null,
            website: payload.website || null,
            instagram: payload.instagram?.replace(/^@/, '') || null,
            notes: payload.notes || null,
            location: payload.location || null,
            about: payload.about || null,
            bank_details: payload.bank_details || null,
          }])
          .select('id')
          .single();
        if (createErr) throw createErr;
        providerId = created.id;
      }

      const { error: linkErr } = await supabase
        .from('event_providers')
        .insert([{ event_id: eventId, provider_id: providerId, status: event_status }]);
      if (linkErr && linkErr.code === '23505') {
        const { error: stErr } = await supabase
          .from('event_providers')
          .update({ status: event_status })
          .eq('event_id', eventId)
          .eq('provider_id', providerId);
        if (stErr) throw stErr;
      } else if (linkErr) {
        throw linkErr;
      }

      toast({ title: payload.id ? 'Proveedor actualizado' : 'Proveedor guardado y vinculado' });
      setOpenForm(false);
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al guardar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Guardado desde ContactsFormModal (crear/editar global) + vincular
  const handleSubmitContacts = async (payload) => {
    setSaving(true);
    try {
      let providerId = payload.id;
      if (providerId) {
        const { error } = await supabase
          .from('planner_providers')
          .update({
            name: payload.name?.trim(),
            category_id: payload.category_id || null,
            contact_name: payload.contact_name?.trim() || null,
            phone: payload.phone?.trim() || null,
            email: payload.email?.trim() || null,
            website: payload.website || null,
            instagram: payload.instagram?.replace(/^@+/, '') || null,
            location: payload.location?.trim() || null,
            about: payload.about?.trim() || null,
            bank_details: payload.bank_details?.trim() || null,
            notes: payload.notes?.trim() || null,
          })
          .eq('id', providerId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('planner_providers')
          .insert([{
            user_id: user.id,
            name: payload.name?.trim(),
            category_id: payload.category_id || null,
            contact_name: payload.contact_name?.trim() || null,
            phone: payload.phone?.trim() || null,
            email: payload.email?.trim() || null,
            website: payload.website || null,
            instagram: payload.instagram?.replace(/^@+/, '') || null,
            location: payload.location?.trim() || null,
            about: payload.about?.trim() || null,
            bank_details: payload.bank_details?.trim() || null,
            notes: payload.notes?.trim() || null,
          }])
          .select('id')
          .single();
        if (error) throw error;
        providerId = data.id;
      }

      const { error: linkErr } = await supabase
        .from('event_providers')
        .insert([{ event_id: eventId, provider_id: providerId, status: 'tentative' }]);
      if (linkErr && linkErr.code !== '23505') throw linkErr;

      toast({ title: 'Proveedor creado y vinculado' });
      setOpenContactsForm(false);
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const unlinkProvider = async (provider_id) => {
    try {
      const { error } = await supabase
        .from('event_providers')
        .delete()
        .eq('event_id', eventId)
        .eq('provider_id', provider_id);
      if (error) throw error;
      toast({ title: 'Proveedor desvinculado' });
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo desvincular', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate(`/host/${eventId}/planner`)}
            className="text-white hover:bg-white/10 mr-3"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Proveedores</h1>
            {eventHeader && (
              <p className="text-xs sm:text-sm text-gray-300 mt-0.5 break-words">
                {eventHeader}
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setOpenPicker(true)} className="bg-green-600 hover:bg-green-500">
          <Plus className="w-4 h-4 mr-1" /> Agregar proveedores
        </Button>
      </div>

      <div className="relative mb-4 mt-2">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400 text-white"
          placeholder="Buscar por nombre, categoría, contacto, email, teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <ProvidersList
        loading={loading}
        rows={filtered}
        onView={handleView}                             // NUEVO: ver
        onEdit={openEdit}                               // ahora abre ContactsFormModal
        onUnlink={unlinkProvider}
        onStatusChange={handleStatusChange}             // NUEVO: estado inline
        labelFromServiceType={labelFromServiceType}
        labelFromEventStatus={labelFromEventStatus}
        statusOptions={EVENT_STATUS}
      />

      {/* Modal legacy del planner (se mantiene por compat) */}
      <ProviderFormModal
        open={openForm}
        onOpenChange={setOpenForm}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        saving={saving}
        myProviders={myProviders}
        serviceTypes={SERVICE_TYPES}
        eventStatus={EVENT_STATUS}
        labelFromServiceType={labelFromServiceType}
      />

      {/* Picker de proveedores globales */}
      <ProviderPickerModal
        open={openPicker}
        onOpenChange={setOpenPicker}
        eventId={eventId}
        onLinked={loadProviders}
        onCreateNew={() => {
          setOpenPicker(false);
          setForm(emptyForm);
          setOpenContactsForm(true);
        }}
      />

      {/* Form global (crear/editar proveedor) */}
      <ContactsFormModal
        open={openContactsForm}
        onOpenChange={setOpenContactsForm}
        onSubmit={handleSubmitContacts}
        form={form}
        setForm={setForm}
        saving={saving}
        serviceTypes={SERVICE_TYPES} // compat si aún lo espera
      />

      {/* Modal de vista (información + productos/servicios del proveedor) */}
      <ProviderViewModal
        open={openView}
        onOpenChange={(v) => { setOpenView(v); if (!v) setViewRow(null); }}
        row={viewRow}
      />

    </div>
  );
};

export default PlannerProviders;
