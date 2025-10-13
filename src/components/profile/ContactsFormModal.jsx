// FILE: src/components/profile/ContactsFormModal.jsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import CategorySelect from '@/components/common/CategorySelect';

export default function ContactsFormModal({
  open,
  onOpenChange,
  onSubmit,
  form,
  setForm,
  saving,
}) {
  const title = form?.id ? 'Editar proveedor' : 'Nuevo proveedor';
  const update = (patch) => setForm?.({ ...form, ...patch });
  const handleSubmit = (e) => { e?.preventDefault?.(); onSubmit?.(form); };

  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1E1E1E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9E7977] focus:border-transparent';
  const textareaCls = inputCls;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] bg-white text-[#1E1E1E] p-0 flex flex-col">
        <div className="px-4 sm:px-6 pt-5">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl sm:text-2xl">{title}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Registra la información básica del proveedor. Puedes editar estos datos más adelante.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-4 sm:px-6 pb-4 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre del proveedor *</Label>
                <input
                  required
                  value={form?.name || ''}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Ej. Floristería Rosas y Luna"
                  className={inputCls}
                />
              </div>

              {/* Solo buscador de categorías (Padre › Hija) */}
              <div className="space-y-2">
                <CategorySelect
                  label="Categoría"
                  value={form?.category_id || ''}
                  onChange={(id) => update({ category_id: id })}
                  allowCreate={true}
                  showParentOption={true}
                />
              </div>

              <div className="space-y-2">
                <Label>Contacto</Label>
                <input
                  value={form?.contact_name || ''}
                  onChange={(e) => update({ contact_name: e.target.value })}
                  placeholder="Nombre de contacto"
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <input
                  type="tel"
                  value={form?.phone || ''}
                  onChange={(e) => update({ phone: e.target.value })}
                  placeholder="Ej. +57 300 123 4567"
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <input
                  type="email"
                  value={form?.email || ''}
                  onChange={(e) => update({ email: e.target.value })}
                  placeholder="contacto@proveedor.com"
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <Label>Instagram</Label>
                <input
                  value={form?.instagram || ''}
                  onChange={(e) => update({ instagram: e.target.value })}
                  placeholder="Ej. @floristeria_rosasluna"
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <Label>Sitio web</Label>
                <input
                  value={form?.website || ''}
                  onChange={(e) => update({ website: e.target.value })}
                  placeholder="Ej. proveedor.com"
                  className={inputCls}
                />
              </div>

              <div className="space-y-2">
                <Label>Ubicación</Label>
                <input
                  value={form?.location || ''}
                  onChange={(e) => update({ location: e.target.value })}
                  placeholder="Ciudad / Región"
                  className={inputCls}
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Acerca de este proveedor</Label>
                <textarea
                  value={form?.about || ''}
                  onChange={(e) => update({ about: e.target.value })}
                  placeholder="Descripción breve, experiencia, especialidades, etc."
                  rows={3}
                  className={textareaCls}
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Detalles bancarios</Label>
                <textarea
                  value={form?.bank_details || ''}
                  onChange={(e) => update({ bank_details: e.target.value })}
                  placeholder="Cuenta bancaria, tipo, titular, NIT/CC, instrucciones de pago, etc."
                  rows={3}
                  className={textareaCls}
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Notas adicionales</Label>
                <textarea
                  value={form?.notes || ''}
                  onChange={(e) => update({ notes: e.target.value })}
                  placeholder="Apunta detalles como precios, horarios, condiciones, etc."
                  rows={4}
                  className={textareaCls}
                />
              </div>
            </div>

            <DialogFooter className="mt-6 border-t border-gray-200 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
