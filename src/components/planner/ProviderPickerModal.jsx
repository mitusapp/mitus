// FILE: src/components/planner/ProviderPickerModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Plus, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { useCategories } from '@/features/categories/useCategories';

/**
 * Modal para seleccionar (y crear) proveedores globales y vincularlos a un evento.
 *
 * Props:
 *  - open: boolean
 *  - onOpenChange: (bool) => void
 *  - eventId: string (requerido para vincular)
 *  - onLinked: () => void     (opcional: refrescar lista del Planner tras vincular)
 *  - onCreateNew: () => void  (opcional: abre tu ProviderFormModal existente)
 *
 * Nota: Para mantener el look & feel del planner, usamos el mismo esquema oscuro
 * que tu ProviderFormModal (bg-slate-800/95, texto blanco, borde verde).
 */
export default function ProviderPickerModal({
  open,
  onOpenChange,
  eventId,
  onLinked,
  onCreateNew,
}) {
  const { user } = useAuth();
  const { byId: categoriesById } = useCategories();

  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(() => new Set());

  // Cargar proveedores globales del usuario
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('planner_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        toast({ title: 'No se pudieron cargar tus proveedores', description: error.message, variant: 'destructive' });
      } else {
        setProviders(data || []);
      }
      setLoading(false);
    })();
  }, [open, user]);

  // normalizador para búsqueda (sin tildes, minúsculas, ignora “de”, “la”)
  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\b(de|la|el|los|las|y|the|of)\b/g, ' ');

  const getCategoryLabel = (p) => {
    if (p?.category_id && categoriesById[p.category_id]) {
      const cat = categoriesById[p.category_id];
      const parent = cat?.parent_id ? categoriesById[cat.parent_id] : null;
      return parent ? `${parent.name} › ${cat.name}` : cat.name;
    }
    // fallback para registros antiguos sin category_id
    return p?.service_type || '—';
  };

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return providers;
    return providers.filter((p) => {
      const hay = norm(
        `${p.name ?? ''} ${p.contact_name ?? ''} ${p.email ?? ''} ${p.phone ?? ''} ${p.instagram ?? ''} ${p.website ?? ''} ${p.location ?? ''} ${getCategoryLabel(p)}`
      );
      return hay.includes(q);
    });
  }, [providers, query]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    if (checked) {
      setSelected(new Set(filtered.map((p) => p.id)));
    } else {
      setSelected(new Set());
    }
  };

  const linkSelected = async () => {
    if (!user || !eventId) return;
    if (!selected.size) {
      toast({ title: 'Selecciona al menos un proveedor' });
      return;
    }

    const providerIds = Array.from(selected);
    try {
      // Insertar vínculos; si ya existe (unique), lo ignoramos o actualizamos status.
      // Aquí insertamos con estado 'tentative' por defecto. Puedes cambiarlo si quieres.
      for (const pid of providerIds) {
        const { error } = await supabase
          .from('event_providers')
          .insert([{ event_id: eventId, provider_id: pid, status: 'tentative' }]);
        if (error && error.code === '23505') {
          // ya estaba vinculado: opcionalmente actualizamos el status o lo ignoramos
          await supabase
            .from('event_providers')
            .update({ status: 'tentative' })
            .eq('event_id', eventId)
            .eq('provider_id', pid);
        } else if (error) {
          throw error;
        }
      }

      toast({ title: `Vinculados ${providerIds.length} proveedor(es)` });
      setSelected(new Set());
      onOpenChange?.(false);
      onLinked?.();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudieron vincular', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelected(new Set()); onOpenChange?.(v); }}>
      <DialogContent className="bg-slate-800/95 text-white border border-green-500 max-w-5xl w-[96vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="text-2xl">Agregar proveedores</DialogTitle>
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
                placeholder="Buscar por nombre, categoría, contacto, email, teléfono…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => onCreateNew?.()}
                className="bg-green-600 hover:bg-green-500"
              >
                <Plus className="w-4 h-4 mr-1" />
                Nuevo proveedor
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={linkSelected} className="bg-emerald-600 hover:bg-emerald-500">
                Vincular seleccionados
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabla con scroll interno */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="rounded border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-gray-300">
                <tr>
                  <th className="p-3">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos"
                      onChange={(e) => toggleAll(e.target.checked)}
                      checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                      indeterminate={filtered.some((p) => selected.has(p.id)) && !filtered.every((p) => selected.has(p.id))}
                    />
                  </th>
                  <th className="text-left p-3 font-medium">Nombre / Notas</th>
                  <th className="text-left p-3 font-medium">Categoría</th>
                  <th className="text-left p-3 font-medium">Contacto</th>
                  <th className="text-left p-3 font-medium">Email / Teléfono</th>
                  <th className="text-left p-3 font-medium">Redes / Web</th>
                  <th className="text-left p-3 font-medium">Ubicación</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-400">Cargando…</td>
                  </tr>
                )}

                {!loading && filtered.map((p) => {
                  const checked = selected.has(p.id);
                  const catLabel = getCategoryLabel(p);
                  const ig = p.instagram?.replace(/^@+/, '');
                  const web = p.website ? (/^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`) : '';

                  return (
                    <tr key={p.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-3 align-top">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(p.id)}
                          aria-label={`Seleccionar ${p.name}`}
                        />
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium text-white">{p.name || '—'}</div>
                        {p.notes && <div className="text-xs text-gray-400 line-clamp-1">{p.notes}</div>}
                      </td>
                      <td className="p-3 align-top text-gray-200">{catLabel}</td>
                      <td className="p-3 align-top text-gray-200">{p.contact_name || '—'}</td>
                      <td className="p-3 align-top text-gray-200">
                        <div>{p.email || '—'}</div>
                        <div className="text-xs text-gray-400">{p.phone || ''}</div>
                      </td>
                      <td className="p-3 align-top">
                        <div className="flex items-center gap-2 text-blue-300">
                          {ig && (
                            <a
                              href={`https://instagram.com/${ig}`}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              Instagram <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {web && (
                            <a
                              href={web}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              Web <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="p-3 align-top text-gray-200">{p.location || '—'}</td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-400">
                      No hay resultados. Crea tu primer proveedor con “Nuevo proveedor”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-4 pb-4">
          <div className="text-xs text-gray-400">
            {selected.size ? `${selected.size} seleccionado(s)` : 'Selecciona uno o varios proveedores para vincular'}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
