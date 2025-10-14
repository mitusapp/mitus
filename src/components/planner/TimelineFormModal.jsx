// src/components/planner/TimelineFormModal.jsx
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Clock, MapPin, Calendar } from 'lucide-react';

// 🚀 Categorías (nuevo)
import { useCategories } from '@/features/categories/useCategories';
import CategorySelect from '@/components/common/CategorySelect.jsx';

/**
 * Modal para crear/editar un hito del cronograma.
 * - Estilo visual unificado (fondo blanco, textos oscuros, inputs con focus ring #9E7977).
 * - Migración a CategorySelect (búsqueda + crear categoría).
 * - Compatibilidad: al seleccionar categoría, también rellenamos `form.category` (LEGADO) con el label.
 */
export default function TimelineFormModal({
  open,
  onOpenChange,
  saving = false,
  form = {},
  setForm = () => { },
  onSubmit = () => { },
  serviceTypes = [],        // (LEGADO) — ya no se usa para el input, pero lo dejamos en la firma para no romper props
  subjects = [],
  teamMembers = [],
  eventProviders = [],
  labelFromServiceType = (v) => v, // (LEGADO) — solo se usa para mostrar label en proveedores
}) {
  const val = (k, fallback = '') => (form?.[k] ?? fallback);
  const on = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1E1E1E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9E7977] focus:border-transparent';

  // 📚 Mapa de categorías en memoria (una sola carga via hook, sin consultas por item)
  const { byId } = useCategories();
  const getCategoryLabel = (id) => {
    if (!id) return '';
    const c = byId[id];
    if (!c) return '';
    const p = c.parent_id ? byId[c.parent_id] : null;
    return p ? `${p.name} › ${c.name}` : c.name;
  };

  // Proveedores del evento (para multi-selección)
  const providers = useMemo(() => {
    return (eventProviders || []).map((r) => {
      const p = r?.planner_providers || {};
      return {
        id: r.provider_id,
        name: p.name || '—',
        service_type: p.service_type || 'other',
        service_type_label: labelFromServiceType(p.service_type) || 'Otro',
      };
    });
  }, [eventProviders, labelFromServiceType]);

  // Búsqueda de proveedores
  const [provQuery, setProvQuery] = useState('');
  const providersFiltered = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    if (!q) return providers;
    return providers.filter((p) => `${p.name} ${p.service_type_label}`.toLowerCase().includes(q));
  }, [provQuery, providers]);

  const toggleProvider = (id) => {
    setForm((f) => {
      const prev = Array.isArray(f.provider_ids) ? f.provider_ids : [];
      const wasSelected = prev.includes(id);
      const next = wasSelected ? prev.filter((x) => x !== id) : [...prev, id];
      if (!wasSelected) setProvQuery('');
      return { ...f, provider_ids: next };
    });
  };

  // Validación mínima: hora fin requerida
  const canSave = Boolean(val('time_end'));

  // ✅ Manejo de cambio de categoría (nuevo)
  const handleCategoryChange = (newId) => {
    const label = getCategoryLabel(newId) || '';
    setForm((f) => ({
      ...f,
      category_id: newId || null,
      // Compatibilidad: mantenemos el string legado con el label humano
      category: label || f.category || '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Misma línea visual que el otro modal: fondo blanco, texto oscuro, p-0 y layout interno con paddings */}
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] bg-white text-[#1E1E1E] p-0 flex flex-col">
        <div className="px-4 sm:px-6 pt-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl sm:text-2xl">{form?.id ? 'Editar actividad' : 'Nueva actividad'}</DialogTitle>
            <DialogDescription className="sr-only">
              Completa la información del hito del cronograma. Las fechas por defecto corresponden a la fecha del evento.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Formulario (mismo orden) */}
        <div className="px-4 sm:px-6 pb-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* 4) Fecha inicio  |  Fecha fin */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Fecha inicio</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  className={`${inputCls} pl-9`}
                  value={val('date_start')}
                  onChange={on('date_start')}
                />
              </div>
            </div>
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Fecha fin</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  className={`${inputCls} pl-9`}
                  value={val('date_end')}
                  onChange={on('date_end')}
                />
              </div>
            </div>

            {/* 5) Hora inicio  |  Hora fin */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Hora inicio</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="time"
                  className={`${inputCls} pl-9`}
                  value={val('time_start')}
                  onChange={on('time_start')}
                />
              </div>
            </div>
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Hora fin</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="time"
                  className={`${inputCls} pl-9`}
                  value={val('time_end')}
                  onChange={on('time_end')}
                />
              </div>
            </div>

            {/* 1) Título */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Título</label>
              <input
                className={inputCls}
                placeholder="Ej. Llegada proveedores, Recepción, Ceremonia…"
                value={val('title')}
                onChange={on('title')}
              />
            </div>

            {/* 2) Descripción / Detalles */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Descripción / Detalles</label>
              <textarea
                rows={3}
                className={inputCls}
                placeholder="Notas operativas, secuencia, cues, etc."
                value={val('description')}
                onChange={on('description')}
              />
            </div>

            {/* 3) Observaciones */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Observaciones</label>
              <textarea
                rows={3}
                className={inputCls}
                placeholder="Observaciones generales, contexto adicional, etc."
                value={val('observations')}
                onChange={on('observations')}
              />
            </div>

            {/* 6) Proveedores implicados */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Proveedores implicados</label>

              {/* Buscador de proveedores */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Escribe para buscar proveedor por nombre o categoría…"
                  value={provQuery}
                  onChange={(e) => setProvQuery(e.target.value)}
                />
              </div>

              {/* Resultados: solo si hay query */}
              {provQuery.trim().length > 0 && (
                <div className="max-h-40 overflow-auto rounded border border-gray-200 bg-white divide-y divide-gray-100">
                  {providersFiltered.map((opt) => {
                    const active = (form.provider_ids || []).includes(opt.id);
                    return (
                      <label key={opt.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleProvider(opt.id)}
                        />
                        <span className="flex-1 text-sm text-[#1E1E1E]">
                          {opt.name}
                          <span className="text-xs text-gray-500 ml-2">{opt.service_type_label}</span>
                        </span>
                      </label>
                    );
                  })}
                  {providersFiltered.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-500">Sin coincidencias…</div>
                  )}
                </div>
              )}

              {/* Seleccionados */}
              {(form.provider_ids || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {(form.provider_ids || []).map((id) => {
                    const p = providers.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                      <span key={id} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-[#1E1E1E] border border-gray-300">
                        {p.name}
                        <span className="text-[11px] text-gray-500 ml-2">{p.service_type_label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 7) Ubicación  |  Categoría */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Ubicación</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className={`${inputCls} pl-9`}
                  placeholder="Ej. Jardín, Salón principal, Iglesia…"
                  value={val('location')}
                  onChange={on('location')}
                />
              </div>
            </div>

            {/* 🎯 NUEVO: CategorySelect con búsqueda y creación */}
            <div className="md:col-span-6">
              {/* Quitamos el label externo para evitar duplicado; CategorySelect ya muestra su propio label */}
              <CategorySelect
                value={val('category_id') || null}
                onChange={handleCategoryChange}
                placeholder="Buscar o crear categoría…"
              />
              {/* Eliminado: texto de compatibilidad visual del legado */}
            </div>

            {/* 8) Sujeto  |  Responsable (equipo) */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Participante(s)</label>
              <select
                className={inputCls}
                value={val('subject', '')}
                onChange={on('subject')}
              >
                <option value="">—</option>
                {subjects.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Responsable (equipo)</label>
              <select
                className={inputCls}
                value={val('assignee_team_id', '')}
                onChange={on('assignee_team_id')}
              >
                <option value="">—</option>
                {teamMembers.map((m) => {
                  const label = m.role ? `${m.name}, ${m.role}` : m.name;
                  return (
                    <option key={m.id} value={m.id}>
                      {label}
                    </option>
                  );
                })}
              </select>

            </div>

            {/* 9) Notas internas */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Notas internas</label>
              <input
                className={inputCls}
                placeholder="Solo para el equipo, no visible para proveedores"
                value={val('internal_notes')}
                onChange={on('internal_notes')}
              />
            </div>
          </div>
        </div>

        {/* Footer con misma estética */}
        <DialogFooter className="border-t border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
          <div className="text-xs text-gray-500">
            {form?.id ? 'Editando actividad existente' : 'Creando nueva actividad'}
          </div>
          <Button onClick={() => canSave && onSubmit(form)} disabled={saving || !canSave}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
