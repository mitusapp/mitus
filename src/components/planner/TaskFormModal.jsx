// src/components/planner/TaskFormModal.jsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import CategorySelect from '@/components/common/CategorySelect';

/**
 * Modal para crear/editar una tarea
 * Props:
 *  - open, onOpenChange
 *  - formData, setFormData
 *  - onSubmit: (e) => void
 *  - saving: boolean
 *  - teamMembers: [{id,name}]
 *  - priorityOptions: [{value,label}]
 *  - visibilityOptions: [{value,label}]
 */
export default function TaskFormModal({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  saving = false,
  teamMembers = [],
  priorityOptions = [],
  visibilityOptions = [],
  title = 'Crear Tarea',
}) {
  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1E1E1E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9E7977] focus:border-transparent';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Misma línea visual que ContactsFormModal: fondo blanco, texto oscuro, p-0 y estructura interna con paddings */}
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] bg-white text-[#1E1E1E] p-0 flex flex-col">
        <div className="px-4 sm:px-6 pt-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl sm:text-2xl">{title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-4 sm:px-6 pb-4 flex-1 overflow-y-auto">
          <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Título */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Título de la tarea</label>
              <input
                type="text"
                className={inputCls}
                placeholder="Ej. Confirmar catering"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Descripción */}
            <div className="md:col-span-12">
              <label className="block text-sm text-gray-700 mb-1">Descripción</label>
              <textarea
                className={inputCls}
                rows={3}
                placeholder="Detalles, sub-tareas, etc."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Prioridad */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Prioridad</label>
              <select
                className={inputCls}
                value={formData.priority || ''}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value || null })}
              >
                <option value="">Sin prioridad</option>
                {priorityOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Categoría (CategorySelect con misma estética de contactos) */}
            <div className="md:col-span-6">
              <CategorySelect
                label="Categoría"
                value={formData.category_id || ''}
                onChange={(id) => setFormData({ ...formData, category_id: id })}
                allowCreate={true}
                showParentOption={true}
              />
            </div>

            {/* Responsable */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Responsable</label>
              <select
                className={inputCls}
                value={formData.assignee_team_id || ''}
                onChange={(e) => setFormData({ ...formData, assignee_team_id: e.target.value || null })}
              >
                <option value="">Sin responsable</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Si no asignas a nadie, en los listados se mostrará tu primer nombre.
              </p>
            </div>

            {/* Visibilidad */}
            <div className="md:col-span-6">
              <label className="block text-sm text-gray-700 mb-1">Visibilidad</label>
              <select
                className={inputCls}
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
              <label className="block text-sm text-gray-700 mb-1">Fecha límite</label>
              <input
                type="date"
                className={inputCls}
                value={formData.due_date ? String(formData.due_date).split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>

            {/* Botones (mismo estilo que contactos: footer con borde-t, botón outline para cancelar) */}
            <div className="md:col-span-12">
              <DialogFooter className="mt-6 border-t border-gray-200 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar Tarea'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
