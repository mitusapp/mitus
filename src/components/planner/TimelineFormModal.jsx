// src/components/planner/TimelineFormModal.jsx
import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search, Clock, MapPin, Calendar } from 'lucide-react';

/**
 * Modal para crear/editar un hito del cronograma.
 * SOLO se cambió el ORDEN DE LOS ELEMENTOS, sin modificar lógica, estilos ni colores.
 * Orden requerido:
 *  - Título
 *  - Descripción / Detalles
 *  - Observaciones
 *  - Fecha inicio  |  Fecha fin
 *  - Hora inicio   |  Hora fin
 *  - Proveedores implicados
 *  - Ubicación     |  Categoría
 *  - Sujeto        |  Responsable (equipo)
 *  - Notas internas
 */
export default function TimelineFormModal({
  open,
  onOpenChange,
  saving = false,
  form = {},
  setForm = () => {},
  onSubmit = () => {},
  serviceTypes = [],
  subjects = [],
  teamMembers = [],
  eventProviders = [],
  labelFromServiceType = (v) => v,
}) {
  const val = (k, fallback = '') => (form?.[k] ?? fallback);
  const on = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      // Mantener comportamiento: al seleccionar un proveedor desde búsqueda se limpia la query para cerrar resultados
      if (!wasSelected) setProvQuery('');
      return { ...f, provider_ids: next };
    });
  };

  // Validación mínima: hora fin requerida
  const canSave = Boolean(val('time_end'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0b0b12] text-white border border-green-500 max-w-3xl md:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{form?.id ? 'Editar hito' : 'Nuevo hito'}</DialogTitle>
          <DialogDescription className="sr-only">
            Completa la información del hito del cronograma. Las fechas por defecto corresponden a la fecha del evento.
          </DialogDescription>
        </DialogHeader>

        {/* Formulario (SOLO reordenado) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 py-2">
          
          {/* 4) Fecha inicio  |  Fecha fin */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Fecha inicio</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20"
                value={val('date_start')}
                onChange={on('date_start')}
              />
            </div>
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Fecha fin</label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20"
                value={val('date_end')}
                onChange={on('date_end')}
              />
            </div>
          </div>

          {/* 5) Hora inicio  |  Hora fin */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Hora inicio</label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="time"
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20"
                value={val('time_start')}
                onChange={on('time_start')}
              />
            </div>
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Hora fin</label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="time"
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20"
                value={val('time_end')}
                onChange={on('time_end')}
              />
            </div>
          </div>
          
          {/* 1) Título */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Título</label>
            <input
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
              placeholder="Ej. Llegada proveedores, Recepción, Ceremonia…"
              value={val('title')}
              onChange={on('title')}
            />
          </div>

          {/* 2) Descripción / Detalles */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Descripción / Detalles</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
              placeholder="Notas operativas, secuencia, cues, etc."
              value={val('description')}
              onChange={on('description')}
            />
          </div>

          {/* 3) Observaciones */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Observaciones</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
              placeholder="Observaciones generales, contexto adicional, etc."
              value={val('observations')}
              onChange={on('observations')}
            />
          </div>

          
          {/* 6) Proveedores implicados */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Proveedores implicados</label>

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
                        checked={active}
                        onChange={() => toggleProvider(opt.id)}
                      />
                      <span className="flex-1 text-sm">
                        {opt.name}
                        <span className="text-xs text-gray-400 ml-2">{opt.service_type_label}</span>
                      </span>
                    </label>
                  );
                })}
                {providersFiltered.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">Sin coincidencias…</div>
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
                    <span key={id} className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/20">
                      {p.name}
                      <span className="text-[11px] text-gray-400 ml-2">{p.service_type_label}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 7) Ubicación  |  Categoría */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Ubicación</label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
                placeholder="Ej. Jardín, Salón principal, Iglesia…"
                value={val('location')}
                onChange={on('location')}
              />
            </div>
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Categoría</label>
            <select
              className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-white/20"
              value={val('category', 'other')}
              onChange={on('category')}
            >
              <option value="" className="text-gray-900">—</option>
              {serviceTypes.map((s) => (
                <option key={s.value} value={s.value} className="text-gray-900">{s.label}</option>
              ))}
            </select>
          </div>

          {/* 8) Sujeto  |  Responsable (equipo) */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Sujeto</label>
            <select
              className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-white/20"
              value={val('subject', '')}
              onChange={on('subject')}
            >
              <option value="" className="text-gray-900">—</option>
              {subjects.map((s) => (
                <option key={s.value} value={s.value} className="text-gray-900">{s.label}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Responsable (equipo)</label>
            <select
              className="w-full px-3 py-2 rounded bg-white text-gray-900 border border-white/20"
              value={val('assignee_team_id', '')}
              onChange={on('assignee_team_id')}
            >
              <option value="" className="text-gray-900">—</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id} className="text-gray-900">{m.display_name || m.name}</option>
              ))}
            </select>
          </div>

          {/* 9) Notas internas */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Notas internas</label>
            <input
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400"
              placeholder="Solo para el equipo, no visible para proveedores"
              value={val('internal_notes')}
              onChange={on('internal_notes')}
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 mt-2">
          <div className="text-xs text-gray-400">
            {form?.id ? 'Editando hito existente' : 'Creando nuevo hito'}
          </div>
          <Button onClick={() => canSave && onSubmit(form)} disabled={saving || !canSave} className="bg-green-600 hover:bg-green-500">
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
