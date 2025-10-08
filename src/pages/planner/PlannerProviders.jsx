// src/pages/planner/PlannerProviders.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/** Catálogo normalizado: service_type → etiqueta visible */
const SERVICE_TYPES = [
  { value: 'photography', label: 'Fotografía' },
  { value: 'video', label: 'Video' },
  { value: 'music', label: 'Música / DJ' },
  { value: 'catering', label: 'Catering / Bebidas' },
  { value: 'decoration', label: 'Decoración / Floristería' },
  { value: 'rentals', label: 'Alquileres / Mobiliario' },
  { value: 'beauty', label: 'Maquillaje / Peinado' },
  { value: 'cake', label: 'Pastel / Postres' },
  { value: 'lighting_sound', label: 'Iluminación / Sonido' },
  { value: 'transport', label: 'Transporte' },
  { value: 'stationery', label: 'Papelería / Invitaciones' },
  { value: 'planning', label: 'Planeación / Coordinación' },
  { value: 'venue', label: 'Locación / Venue' },
  { value: 'other', label: 'Otro' },
];

const labelFromServiceType = (st) =>
  SERVICE_TYPES.find((s) => s.value === st)?.label || (st ?? '—');

const STATUS = ['tentative', 'confirmed', 'declined'];

const emptyForm = {
  name: '',
  // category desaparece del formulario visible; se sincroniza con service_type para compatibilidad
  service_type: 'other',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  instagram: '',
  notes: '',
  location: '',
  status: 'tentative',
};

const ProviderForm = ({ open, onOpenChange, onSubmit, form, setForm, saving }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/95 text-white border border-green-500">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nuevo proveedor</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-4 py-2">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nombre del negocio</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Ej. Ignacio Ramírez Fotografía"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Categoría</label>
            <select
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })}
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Contacto</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Nombre de la persona de contacto"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
              <input
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                placeholder="+57 300 000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                placeholder="contacto@proveedor.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Sitio web</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="https://…"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Instagram</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="@usuario"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Ubicación</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Ciudad / País"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Estado</label>
            <select
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {['tentative', 'confirmed', 'declined'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Notas</label>
            <textarea
              rows={3}
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Información adicional, peticiones, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={saving} className="bg-green-600 hover:bg-green-700">
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PlannerProviders = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [rows, setRows] = useState([]);       // proveedores vinculados al evento
  const [myProviders, setMyProviders] = useState([]); // todos mis proveedores (para reutilizar en el futuro)

  const loadProviders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // IMPORTANTE: event_providers no tiene columna id → no la pedimos
      const { data: eventProviders, error: epErr } = await supabase
        .from('event_providers')
        .select('provider_id, created_at, planner_providers(*)')
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
  }, [eventId, user]);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const p = r.planner_providers || {};
      const cat = labelFromServiceType(p.service_type) || p.category || '';
      const haystack = [
        p.name || '',
        cat || '',
        p.contact_name || '',
        p.email || '',
        p.phone || '',
        p.instagram || '',
        p.website || '',
        p.location || '',
        p.status || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const handleOpenForm = () => {
    setForm(emptyForm);
    setOpenForm(true);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!form.name?.trim()) {
      toast({ title: 'Falta nombre del proveedor', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // 1) crear o reutilizar por (user_id + name)
      let providerId;

      const { data: existing, error: exErr } = await supabase
        .from('planner_providers')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', form.name.trim())
        .maybeSingle();
      if (exErr) throw exErr;

      if (existing) {
        providerId = existing.id;
        // actualizamos datos principales
        const { error: updErr } = await supabase
          .from('planner_providers')
          .update({
            // sincronizamos category por compatibilidad (texto = service_type)
            category: form.service_type,
            service_type: form.service_type || 'other',
            contact_name: form.contact_name || null,
            email: form.email || null,
            phone: form.phone || null,
            website: form.website || null,
            instagram: form.instagram || null,
            notes: form.notes || null,
            location: form.location || null,
            status: form.status || 'tentative',
          })
          .eq('id', providerId);
        if (updErr) throw updErr;
      } else {
        const { data: created, error: createErr } = await supabase
          .from('planner_providers')
          .insert([
            {
              user_id: user.id,
              name: form.name.trim(),
              // guardamos service_type como categoría normalizada
              service_type: form.service_type || 'other',
              // y category textual para compatibilidad con listados antiguos
              category: form.service_type,
              contact_name: form.contact_name || null,
              email: form.email || null,
              phone: form.phone || null,
              website: form.website || null,
              instagram: form.instagram || null,
              notes: form.notes || null,
              location: form.location || null,
              status: form.status || 'tentative',
            },
          ])
          .select('id')
          .single();
        if (createErr) throw createErr;
        providerId = created.id;
      }

      // 2) vincular al evento (clave compuesta event_id + provider_id)
      const { error: linkErr } = await supabase
        .from('event_providers')
        .insert([{ event_id: eventId, provider_id: providerId }]);
      if (linkErr && linkErr.code !== '23505') throw linkErr; // 23505 = ya existe

      toast({ title: 'Proveedor guardado y vinculado' });
      setOpenForm(false);
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al crear proveedor', description: e.message, variant: 'destructive' });
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

      toast({ title: 'Proveedor desvinculado del evento' });
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al desvincular', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate(`/host/${eventId}/planner`)}
                className="text-white hover:bg-white/10 mr-4"
              >
                <ArrowLeft />
              </Button>
              <h1 className="text-2xl font-bold text-white">Proveedores</h1>
            </div>
            <Button onClick={handleOpenForm} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo proveedor
            </Button>
          </div>

          {/* Buscador */}
          <div className="relative w-full md:w-96 mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="search"
              placeholder="Buscar por nombre, categoría, contacto, email…"
              className="w-full p-2 pl-9 rounded-lg border border-white/20 bg-white/10 text-sm text-white focus:ring-2 focus:ring-green-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Tabla */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[960px]">
                <thead>
                  <tr className="border-b border-white/20 text-gray-300 text-sm">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Contacto</th>
                    <th className="p-3">Email / Tel</th>
                    <th className="p-3">Redes / Web</th>
                    <th className="p-3">Ubicación</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    filtered.map((r) => {
                      const p = r.planner_providers || {};
                      const categoryLabel = labelFromServiceType(p.service_type) || p.category || '—';
                      return (
                        <tr key={r.provider_id} className="border-b border-white/10 hover:bg-white/5">
                          <td className="p-3">
                            <div className="font-medium text-white">{p.name || '—'}</div>
                            {p.notes && <div className="text-xs text-gray-400 line-clamp-1">{p.notes}</div>}
                          </td>
                          <td className="p-3 text-gray-200">{categoryLabel}</td>
                          <td className="p-3 text-gray-200">{p.contact_name || '—'}</td>
                          <td className="p-3 text-gray-200">
                            <div>{p.email || '—'}</div>
                            <div className="text-xs text-gray-400">{p.phone || ''}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 text-blue-300">
                              {p.instagram && (
                                <a
                                  href={`https://instagram.com/${p.instagram.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline inline-flex items-center gap-1"
                                >
                                  Instagram <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {p.website && (
                                <a
                                  href={p.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline inline-flex items-center gap-1"
                                >
                                  Web <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-gray-200">{p.location || '—'}</td>
                          <td className="p-3">
                            <span
                              className={
                                'px-2 py-1 rounded-full text-xs ' +
                                (p.status === 'confirmed'
                                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                                  : p.status === 'declined'
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40')
                              }
                            >
                              {p.status || 'tentative'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-400"
                                title="Desvincular del evento"
                                onClick={() => unlinkProvider(r.provider_id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {!loading && filtered.length === 0 && (
                <p className="text-center text-gray-400 py-8">No hay proveedores para mostrar.</p>
              )}
              {loading && <p className="text-center text-gray-400 py-8">Cargando…</p>}
            </div>
          </div>
        </motion.div>
      </div>

      <ProviderForm
        open={openForm}
        onOpenChange={setOpenForm}
        onSubmit={handleCreate}
        form={form}
        setForm={setForm}
        saving={saving}
      />
    </div>
  );
};

export default PlannerProviders;
