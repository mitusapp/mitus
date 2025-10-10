import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Clock, MapPin, Users, Layers, CheckSquare, UserSquare2, Calendar } from 'lucide-react';

/**
 * Modal para crear/editar un hito del cronograma.
 * Campos FE: date_start, time_start, date_end, time_end (se combinan a start_time/end_time en el submit del padre).
 *
 * Props:
 *  - open, onOpenChange, saving
 *  - form, setForm
 *  - onSubmit(form)
 *  - serviceTypes, subjects, teamMembers, eventProviders
 *  - labelFromServiceType
 */
export default function TimelineFormModal({
  open,
  onOpenChange,
  saving,
  form,
  setForm,
  onSubmit,
  serviceTypes = [],
  subjects = [],
  teamMembers = [],
  eventProviders = [],
  labelFromServiceType,
}) {
  const [provQuery, setProvQuery] = useState('');

  const providersBase = useMemo(() => {
    return (eventProviders || [])
      .map((r) => {
        const p = r.planner_providers || {};
        return {
          id: r.provider_id,
          name: p.name || '—',
          labelCat: labelFromServiceType?.(p.service_type) || p.service_type || '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [eventProviders, labelFromServiceType]);

  const providersFiltered = useMemo(() => {
    const q = provQuery.trim().toLowerCase();
    if (!q) return []; // ← solo mostrar si hay texto
    return providersBase.filter((o) => `${o.name} ${o.labelCat}`.toLowerCase().includes(q));
  }, [providersBase, provQuery]);

  const toggleProvider = (id) => {
    const set = new Set(form.provider_ids || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    setForm({ ...form, provider_ids: Array.from(set) });
  };

  // helpers para inputs
  const val = (s) => (s || '');
  const on = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/95 text-white border border-purple-500 w-[95vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{form?.id ? 'Editar hito' : 'Crear hito'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid md:grid-cols-12 gap-3">
            {/* Título */}
            <div className="md:col-span-12">
              <label className="text-sm text-gray-300 mb-1 block">Título del hito</label>
              <input
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                placeholder="Ej. Llegada de invitados / Ingreso novios"
                value={val(form.title)}
                onChange={on('title')}
                required
              />
            </div>

            {/* FECHA inicio / FECHA fin */}
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Fecha de inicio
              </label>
              <input
                type="date"
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                value={val(form.date_start)}
                onChange={on('date_start')}
              />
            </div>
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Fecha de fin
              </label>
              <input
                type="date"
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                value={val(form.date_end)}
                onChange={on('date_end')}
              />
            </div>

            {/* HORA inicio / HORA fin */}
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Hora de inicio
              </label>
              <input
                type="time"
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                value={val(form.time_start)}
                onChange={on('time_start')}
              />
            </div>
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Hora de fin (opcional)
              </label>
              <input
                type="time"
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                value={val(form.time_end)}
                onChange={on('time_end')}
              />
            </div>

            {/* Categoría / Sujeto */}
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <Layers className="w-4 h-4" /> Categoría
              </label>
              <select
                className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
                value={form.category || 'other'}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {serviceTypes.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <UserSquare2 className="w-4 h-4" /> Sujeto / Protagonista
              </label>
              <select
                className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
                value={form.subject || ''}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              >
                <option value="">Sin sujeto</option>
                {subjects.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Responsable / Ubicación */}
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <Users className="w-4 h-4" /> Responsable
              </label>
              <select
                className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
                value={form.assignee_team_id || ''}
                onChange={(e) => setForm({ ...form, assignee_team_id: e.target.value || null })}
              >
                <option value="">Sin responsable</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.display_name || m.name || 'Miembro'}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-6">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Ubicación / Espacio
              </label>
              <input
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                placeholder="Ej. Jardín, Salón principal, Iglesia…"
                value={val(form.location)}
                onChange={on('location')}
              />
            </div>

            {/* Proveedores (multi) */}
            <div className="md:col-span-12">
              <label className="text-sm text-gray-300 mb-1 flex items-center gap-1">
                <CheckSquare className="w-4 h-4" /> Proveedores implicados
              </label>

              {/* Buscador de proveedores */}
              <div className="relative mb-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
                  placeholder="Escribe para buscar proveedor por nombre o categoría…"
                  value={provQuery}
                  onChange={(e) => setProvQuery(e.target.value)}
                />
              </div>

              {/* Resultados: solo si hay query */}
              {provQuery.trim().length > 0 && (
                <div className="max-h-40 overflow-auto rounded border border-white/20 bg-white/5 divide-y divide-white/10">
                  {providersFiltered.map((opt) => {
                    const active = (form.provider_ids || []).includes(opt.id);
                    return (
                      <label key={opt.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5">
                        <input
                          type="checkbox"
                          className="accent-purple-500"
                          checked={active}
                          onChange={() => toggleProvider(opt.id)}
                        />
                        <span className="flex-1">
                          <span className="text-white">{opt.name}</span>
                          {opt.labelCat && <span className="text-xs text-gray-400"> • {opt.labelCat}</span>}
                        </span>
                      </label>
                    );
                  })}
                  {providersFiltered.length === 0 && (
                    <div className="px-3 py-2 text-sm text-gray-400">Sin resultados.</div>
                  )}
                </div>
              )}

              {/* Seleccionados */}
              {form.provider_ids?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.provider_ids.map((id) => {
                    const opt = providersBase.find((o) => o.id === id) ||
                                eventProviders.find((r) => r.provider_id === id);
                    const name = opt?.name || opt?.planner_providers?.name || 'Proveedor';
                    return (
                      <span key={id} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs">
                        {name}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Descripción */}
            <div className="md:col-span-12">
              <label className="text-sm text-gray-300 mb-1 block">Descripción / Instrucciones</label>
              <textarea
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                rows={3}
                placeholder="Detalle del hito, transición con el siguiente, tiempos de montaje, etc."
                value={val(form.description)}
                onChange={on('description')}
              />
            </div>

            {/* Cues / Notas internas */}
            <div className="md:col-span-12">
              <label className="text-sm text-gray-300 mb-1 block">Cues / Notas internas (A/V, música, iluminación, micrófonos…)</label>
              <textarea
                className="w-full p-2 rounded bg-white/10 border border-white/20"
                rows={3}
                placeholder="Ej. Track 03 a las 7:15pm, micrófono inalámbrico para speech, blackout al finalizar."
                value={val(form.av_cues)}
                onChange={on('av_cues')}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 mt-4">
          <div className="text-xs text-gray-400">
            {form?.id ? 'Editando hito existente' : 'Creando nuevo hito'}
          </div>
          <Button onClick={() => onSubmit(form)} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
