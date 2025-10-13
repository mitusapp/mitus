// FILE: src/pages/ProfileContactsPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfileTabsNav from '@/components/profile/ProfileTabsNav';
import ProfileHeaderBar from '@/components/profile/ProfileHeaderBar';

// Independent profile components
import ContactsHeader from '@/components/profile/ContactsHeader';
import ContactsList from '@/components/profile/ContactsList';
import ContactsFormModal from '@/components/profile/ContactsFormModal';
import { useCategories } from '@/features/categories/useCategories';

// NEW: modal de vista (ojo)
import ProviderViewModal from '@/components/profile/ProviderViewModal';

const normalize = (s) =>
  (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function ProfileContactsPage() {
  const { user } = useAuth();
  const { byId } = useCategories();

  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState('');

  // === Modal state ===
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: undefined,
    name: '',
    category_id: null,
    contact_name: '',
    phone: '',
    email: '',
    website: '',
    instagram: '',
    location: '',
    about: '',
    bank_details: '',
    notes: '',
  });

  // NEW: estado para modal de vista
  const [viewRow, setViewRow] = useState(null);
  const openView = (row) => setViewRow(row);

  // === Data ===
  const loadProviders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('planner_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProviders(data || []);
    } catch (e) {
      console.error(e);
      toast({
        title: 'No se pudieron cargar tus proveedores',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  // === Search (incluye nombre de categoría Padre › Hija) ===
  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return providers;
    return providers.filter((p) => {
      const cat = p.category_id ? byId[p.category_id] : null;
      const parent = cat?.parent_id ? byId[cat.parent_id] : null;
      const categoryLabel = cat ? (parent ? `${parent.name} ${cat.name}` : cat.name) : '';
      const hay = [
        p.name,
        p.contact_name,
        p.email,
        p.phone,
        p.instagram,
        p.website,
        p.location,
        p.about,
        p.bank_details,
        p.notes,
        categoryLabel,
      ]
        .map((s) => normalize(s))
        .join(' ');
      return hay.includes(q);
    });
  }, [providers, query, byId]);

  // Adapt to ContactsList rows shape
  const rowsForTable = useMemo(
    () => filtered.map((p) => ({ provider_id: p.id, created_at: p.created_at, planner_providers: p })),
    [filtered]
  );

  // === UI actions ===
  const resetForm = () =>
    setForm({
      id: undefined,
      name: '',
      category_id: null,
      contact_name: '',
      phone: '',
      email: '',
      website: '',
      instagram: '',
      location: '',
      about: '',
      bank_details: '',
      notes: '',
    });

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (row) => {
    const p = row?.planner_providers || {};
    setForm({
      id: p.id,
      name: p.name || '',
      category_id: p.category_id || null,
      contact_name: p.contact_name || '',
      phone: p.phone || '',
      email: p.email || '',
      website: p.website || '',
      instagram: p.instagram || '',
      location: p.location || '',
      about: p.about || '',
      bank_details: p.bank_details || '',
      notes: p.notes || '',
    });
    setOpen(true);
  };

  const sanitizeWebsite = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    return `https://${url}`;
  };
  const sanitizeInstagram = (handle) => (handle || '').replace(/^@+/, '');

  const handleSubmit = async (payload) => {
    if (!user) return;

    const base = {
      name: (payload.name || '').trim(),
      category_id: payload.category_id || null,
      contact_name: (payload.contact_name || '').trim() || null,
      phone: (payload.phone || '').trim() || null,
      email: (payload.email || '').trim() || null,
      website: sanitizeWebsite(payload.website),
      instagram: sanitizeInstagram(payload.instagram),
      location: (payload.location || '').trim() || null,
      about: (payload.about || '').trim() || null,
      bank_details: (payload.bank_details || '').trim() || null,
      notes: (payload.notes || '').trim() || null,
    };

    setSaving(true);
    try {
      if (payload.id) {
        const { error } = await supabase
          .from('planner_providers')
          .update(base)
          .eq('id', payload.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast({ title: 'Proveedor actualizado' });
      } else {
        const { error } = await supabase
          .from('planner_providers')
          .insert([{ ...base, user_id: user.id }]);
        if (error) throw error;
        toast({ title: 'Proveedor creado' });
      }
      setOpen(false);
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (provider_id) => {
    if (!provider_id || !user) return;
    const ok = window.confirm('¿Eliminar este proveedor de tus contactos?');
    if (!ok) return;
    try {
      const { error } = await supabase
        .from('planner_providers')
        .delete()
        .eq('id', provider_id)
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Proveedor eliminado' });
      await loadProviders();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo eliminar', description: e.message, variant: 'destructive' });
    }
  };

  if (loading && !providers.length) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <ProfileHeaderBar />
          <ProfileTabsNav activeTab="contacts" />
          <div className="mt-6" />

          <ContactsHeader query={query} onQueryChange={setQuery} onNew={openCreate} />

          <ContactsList
            rows={rowsForTable}
            onView={openView}        // NEW: ver proveedor
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        </motion.div>
      </div>

      <ContactsFormModal
        open={open}
        onOpenChange={setOpen}
        onSubmit={handleSubmit}
        form={form}
        setForm={setForm}
        saving={saving}
      />

      {/* NEW: Modal de vista */}
      <ProviderViewModal
        open={!!viewRow}
        onOpenChange={(v) => { if (!v) setViewRow(null); }}
        row={viewRow}
      />
    </div>
  );
}
