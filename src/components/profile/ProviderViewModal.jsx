// FILE: src/components/profile/ProviderViewModal.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useCategories } from '@/features/categories/useCategories';
import { Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function ProviderViewModal({ open, onOpenChange, row }) {
  const p = row?.planner_providers || {};
  const providerId = p?.id;
  const { user } = useAuth();
  const { byId } = useCategories();

  // ====== Items state ======
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const categoryLabel = useMemo(() => {
    if (!p?.category_id || !byId[p.category_id]) return '—';
    const cat = byId[p.category_id];
    const parent = cat?.parent_id ? byId[cat.parent_id] : null;
    return parent ? `${parent.name} › ${cat.name}` : cat.name;
  }, [p?.category_id, byId]);

  const ig = (p.instagram || '').replace(/^@+/, '');
  const website = p.website && /^https?:\/\//i.test(p.website)
    ? p.website
    : (p.website ? `https://${p.website}` : '');

  // ====== CRUD ======
  const loadItems = useCallback(async () => {
    if (!user || !providerId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('planner_provider_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error(error);
      toast({ title: 'No se pudieron cargar los ítems', description: error.message, variant: 'destructive' });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [user, providerId]);

  useEffect(() => {
    if (open) loadItems();
  }, [open, loadItems]);

  const addItem = async () => {
    if (!user || !providerId) return;
    const { data, error } = await supabase
      .from('planner_provider_items')
      .insert([{ user_id: user.id, provider_id: providerId, name: '', description: '', price: null, active: true }])
      .select('*').single();
    if (error) {
      console.error(error);
      toast({ title: 'No se pudo agregar el ítem', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => [...prev, data]);
  };

  const updateItem = async (id, patch) => {
    if (!user || !id) return;
    const { error } = await supabase
      .from('planner_provider_items')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error(error);
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    }
  };

  const deleteItem = async (id) => {
    if (!user || !id) return;
    const ok = window.confirm('¿Eliminar este ítem?');
    if (!ok) return;
    const { error } = await supabase
      .from('planner_provider_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      console.error(error);
      toast({ title: 'No se pudo eliminar', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // ====== Helpers ======
  const setLocalAndSave = (id, field, value) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };
  const onBlurSave = (id, field, value) => {
    updateItem(id, { [field]: value === '' ? null : value });
  };
  const fmtCurrency = (n) => {
    if (n === null || n === undefined || n === '') return '';
    const num = Number(n);
    if (Number.isNaN(num)) return String(n);
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-5xl max-h-[92vh] bg-white text-[#1E1E1E] p-0 flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl sm:text-2xl">Proveedor: {p?.name || '—'}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Consulta la información y administra los productos/servicios ofrecidos por este proveedor.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body con scroll */}
        <div className="px-4 sm:px-6 pb-5 flex-1 overflow-y-auto">
          {/* Info del proveedor */}
          <section className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Info label="Categoría" value={categoryLabel} />
              <Info label="Contacto" value={p.contact_name} />
              <Info label="Teléfono" value={p.phone} />
              <Info label="Email" value={p.email} isLink={p.email ? `mailto:${p.email}` : ''} />
              <Info label="Instagram" value={ig ? `@${ig}` : ''} isLink={ig ? `https://instagram.com/${ig}` : ''} />
              <Info label="Web" value={p.website} isLink={website} />
              <Info label="Ubicación" value={p.location} />
              <Info label="Estado" value={p.active === false ? 'Inactivo' : 'Activo'} />
            </div>
            {p.about ? (
              <div className="mt-4">
                <Label>Acerca de este proveedor</Label>
                <p className="mt-1 text-sm text-[#1E1E1E] whitespace-pre-wrap">{p.about}</p>
              </div>
            ) : null}
            {p.bank_details ? (
              <div className="mt-4">
                <Label>Detalles bancarios</Label>
                <p className="mt-1 text-sm text-[#1E1E1E] whitespace-pre-wrap">{p.bank_details}</p>
              </div>
            ) : null}
            {p.notes ? (
              <div className="mt-4">
                <Label>Notas adicionales</Label>
                <p className="mt-1 text-sm text-[#1E1E1E] whitespace-pre-wrap">{p.notes}</p>
              </div>
            ) : null}
          </section>

          {/* Ítems */}
          <section className="mt-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Productos / Servicios</h3>
              <Button type="button" onClick={addItem}>Agregar item</Button>
            </div>

            <div className="mt-3 overflow-x-auto rounded-2xl border border-[#DCD9D6]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F7F6F5] text-[#2A2A2A]">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nombre</th>
                    <th className="px-3 py-2 font-semibold">Descripción</th>
                    <th className="px-3 py-2 font-semibold">Valor</th>
                    <th className="px-3 py-2 font-semibold">Activo</th>
                    <th className="px-3 py-2 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={5}>Cargando…</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td className="px-3 py-8 text-center text-gray-500" colSpan={5}>No hay ítems aún. Crea el primero.</td></tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it.id} className="border-t border-[#EEECE9] hover:bg-[#FAFAF9]">
                        <td className="px-3 py-2 align-top w-[28%]">
                          <input
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            value={it.name || ''}
                            onChange={(e) => setLocalAndSave(it.id, 'name', e.target.value)}
                            onBlur={(e) => onBlurSave(it.id, 'name', e.target.value)}
                            placeholder="Nombre del ítem"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <textarea
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            rows={2}
                            value={it.description || ''}
                            onChange={(e) => setLocalAndSave(it.id, 'description', e.target.value)}
                            onBlur={(e) => onBlurSave(it.id, 'description', e.target.value)}
                            placeholder="Descripción breve"
                          />
                        </td>
                        <td className="px-3 py-2 align-top w-[14%]">
                          <input
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                            inputMode="numeric"
                            value={it.price ?? ''}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, '');
                              setLocalAndSave(it.id, 'price', raw === '' ? null : Number(raw));
                            }}
                            onBlur={(e) => {
                              const raw = e.target.value.replace(/[^\d]/g, '');
                              onBlurSave(it.id, 'price', raw === '' ? null : Number(raw));
                            }}
                            placeholder="0"
                          />
                          {it.price ? (
                            <div className="text-xs text-gray-500 mt-1">{fmtCurrency(it.price)}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top w-[10%]">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={it.active !== false}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setLocalAndSave(it.id, 'active', val);
                                updateItem(it.id, { active: val });
                              }}
                            />
                            <span className="text-sm text-[#1E1E1E]">{it.active !== false ? 'Activo' : 'Inactivo'}</span>
                          </label>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => deleteItem(it.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                              title="Eliminar ítem"
                              aria-label="Eliminar ítem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value, isLink }) {
  const content = value ? String(value) : '—';
  return (
    <div>
      <Label className="block">{label}</Label>
      {isLink && value ? (
        <a href={isLink} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-[#2A5BD7] hover:underline">
          {content}
        </a>
      ) : (
        <div className="mt-1 text-sm text-[#1E1E1E]">{content}</div>
      )}
    </div>
  );
}
