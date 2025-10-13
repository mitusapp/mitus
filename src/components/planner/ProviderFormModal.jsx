// src/components/planner/ProviderFormModal.jsx
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PhoneInput from '@/components/PhoneInput';
import { useCategories } from '@/features/categories/useCategories';

/**
 * Modal de creación/edición de proveedor + búsqueda para vincular existente.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (bool) => void
 *  - onSubmit: (payload) => Promise<void>
 *  - form: objeto con campos del proveedor + event_status
 *  - setForm: (form) => void
 *  - saving: boolean
 *  - myProviders: proveedores del usuario (para buscar y vincular)
 *  - serviceTypes: Array<{value,label}>           // (legacy, ya no se usa para el picker)
 *  - eventStatus: Array<{value,label}>
 *  - labelFromServiceType: (value) => string      // (legacy, usado solo como fallback en listados)
 */
export default function ProviderFormModal({
  open,
  onOpenChange,
  onSubmit,
  form,
  setForm,
  saving,
  myProviders = [],
  serviceTypes = [],            // mantenido para compatibilidad, no se usa en el select
  eventStatus = [],
  labelFromServiceType,
}) {
  const [query, setQuery] = useState('');
  const { byId: categoriesById } = useCategories();

  // normaliza para búsquedas (quita acentos y pasa a minúsculas)
  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Obtener etiqueta "Padre › Hija" desde app_categories (fallback: service_type legacy)
  const getCategoryLabel = (provider) => {
    const cid = provider?.category_id;
    if (cid && categoriesById[cid]) {
      const cat = categoriesById[cid];
      const parent = cat?.parent_id ? categoriesById[cat.parent_id] : null;
      return parent ? `${parent.name} › ${cat.name}` : cat.name;
    }
    return labelFromServiceType?.(provider?.service_type) || '—';
  };

  // Opciones flateadas de categorías (Padre primero, luego sus hijas)
  const categoryOptions = useMemo(() => {
    const all = Object.values(categoriesById || {});
    const parents = all.filter((c) => !c.parent_id).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const childrenByParent = new Map();
    all.forEach((c) => {
      if (c.parent_id) {
        if (!childrenByParent.has(c.parent_id)) childrenByParent.set(c.parent_id, []);
        childrenByParent.get(c.parent_id).push(c);
      }
    });
    parents.forEach((p) => {
      const kids = childrenByParent.get(p.id);
      if (kids) kids.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    });

    const out = [];
    parents.forEach((p) => {
      out.push({ id: p.id, label: p.name }); // el padre también es seleccionable
      const kids = childrenByParent.get(p.id) || [];
      kids.forEach((k) => out.push({ id: k.id, label: `${p.name} › ${k.name}` }));
    });
    return out;
  }, [categoriesById]);

  const filteredExisting = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return [];
    return myProviders
      .filter((p) => {
        const label = getCategoryLabel(p);
        const hay = norm(`${p.name ?? ''} ${label ?? ''}`);
        return hay.includes(q);
      })
      .slice(0, 8);
  }, [myProviders, query, categoriesById]);

  const handlePickExisting = async (provider) => {
    try {
      await onSubmit({
        ...form,
        id: provider.id,
        name: provider.name,
        // ya no necesitamos pasar service_type; _linkOnly usa el id
        _linkOnly: true,
      });
      setQuery('');
    } catch (_) {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/95 text-white border border-green-500 max-w-3xl md:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Nuevo proveedor</DialogTitle>

          {/* 🔎 Buscador para reutilizar proveedor existente */}
          <div className="mt-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
                placeholder="Buscar nombre de proveedor o categoría"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {!!filteredExisting.length && (
              <div className="mt-2 rounded border border-white/10 divide-y divide-white/10 bg-slate-900/90">
                {filteredExisting.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePickExisting(p)}
                    className="w-full text-left px-3 py-2 hover:bg-white/5"
                  >
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-400">
                      {getCategoryLabel(p)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 🧾 Formulario de creación/edición */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-2">
          {/* Nombre / Categoría */}
          <div className="md:col-span-7">
            <label className="block text-sm text-gray-300 mb-1">Nombre del negocio</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Ej. Ignacio Ramírez Fotografía"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-sm text-gray-300 mb-1">Categoría</label>
            <select
              className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
              value={form.category_id || ''}                          // ← ahora usamos category_id
              onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
            >
              <option value="">Selecciona una categoría</option>
              {categoryOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contacto / Teléfono */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Persona de contacto</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Nombre de la persona de contacto"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Teléfono</label>
            <div className="w-full">
              <PhoneInput
                value={form.phone || ''}
                onChange={(val) => setForm({ ...form, phone: val })}
                placeholder="300 000 0000"
              />
            </div>
          </div>

          {/* Email / Sitio web */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="contacto@proveedor.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Sitio web</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="https://sitio.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          {/* Instagram / Ubicación */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Instagram</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="@usuario"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Ubicación</label>
            <input
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Ciudad, país"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          {/* Estado (por evento) */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Estado (por evento)</label>
            <select
              className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
              value={form.event_status}
              onChange={(e) => setForm({ ...form, event_status: e.target.value })}
            >
              {eventStatus.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Notas</label>
            <textarea
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              rows={3}
              placeholder="Observaciones, condiciones, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <div className="text-xs text-gray-400">
            {form.id ? 'Editando proveedor existente' : 'Creando nuevo proveedor'}
          </div>
          <Button
            onClick={() => onSubmit(form)}
            disabled={saving}
            className="bg-green-600 hover:bg-green-500"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
