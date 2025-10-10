// src/components/planner/TaskFormModal.jsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Modal para crear/editar una tarea
 * Props:
 *  - open, onOpenChange
 *  - formData, setFormData
 *  - onSubmit: (e) => void  (ya previeneDefault en el padre si quieres)
 *  - saving: boolean
 *  - teamMembers: [{id,name}]
 *  - serviceTypes: [{value,label}]
 *  - priorityOptions: [{value,label}]
 *  - visibilityOptions: [{value,label}]
 *  - labelFromServiceType: (value) => string
 */
export default function TaskFormModal({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving = false,
  teamMembers = [],
  serviceTypes = [],
  priorityOptions = [],
  visibilityOptions = [],
  labelFromServiceType,
  title = 'Crear Tarea',
}) {
  // Si hay una categoría previa no mapeada, la mostramos como opción temporal
  const hasCategory = !!formData.category;
  const isKnownCategory = serviceTypes.some((s) => s.value === formData.category);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/95 text-white border border-cyan-500 max-w-3xl md:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 py-2"
        >
          {/* Título */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Título de la tarea</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              placeholder="Ej. Confirmar catering"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Descripción */}
          <div className="md:col-span-12">
            <label className="block text-sm text-gray-300 mb-1">Descripción</label>
            <textarea
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              rows={3}
              placeholder="Detalles, sub-tareas, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Prioridad / Categoría */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Prioridad</label>
            <select
              className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
              value={formData.priority || ''}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value || null })}
            >
              <option value="">Sin prioridad</option>
              {priorityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Categoría</label>
            <select
              className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value || null })}
            >
              <option value="">Sin categoría</option>
              {!isKnownCategory && hasCategory && (
                <option value={formData.category}>
                  {labelFromServiceType?.(formData.category) || formData.category} (actual)
                </option>
              )}
              {serviceTypes.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Responsable / Visibilidad */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Responsable</label>
            <select
              className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
              value={formData.assignee_team_id || ''}
              onChange={(e) => setFormData({ ...formData, assignee_team_id: e.target.value || null })}
            >
              <option value="">Sin responsable</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Si no asignas a nadie, en los listados se mostrará tu primer nombre.
            </p>
          </div>

          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Visibilidad</label>
            <select
              className="w-full p-2 rounded border border-white/20 bg-white text-gray-900"
              value={formData.visibility || 'private'}
              onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
            >
              {visibilityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Fecha límite */}
          <div className="md:col-span-6">
            <label className="block text-sm text-gray-300 mb-1">Fecha límite</label>
            <input
              type="date"
              className="w-full p-2 rounded bg-white/10 border border-white/20"
              value={formData.due_date ? String(formData.due_date).split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Botones */}
          <div className="md:col-span-12">
            <DialogFooter className="flex items-center justify-between gap-2">
              <div className="text-xs text-gray-400">
                {title === 'Editar Tarea' ? 'Editando tarea existente' : 'Creando nueva tarea'}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                  {saving ? 'Guardando…' : 'Guardar Tarea'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
