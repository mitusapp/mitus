// src/components/planner/BudgetFormModal.jsx (actualizado)
// - Sincroniza unit_cost, quantity y description al editar.
// - "Agregar cuota": fecha por defecto = +1 mes respecto a la anterior y
//   reparto automático del total entre todas las cuotas.
// - Calculadora detallada de reparto bajo "Total por cuotas".
// - Mantiene diseño, estilos y flujos existentes.

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';

// Catálogo de categorías (igual que en Tasks)
const SERVICE_TYPES = [
  { value: 'wedding_planner', label: 'Organizador/a de bodas' },
  { value: 'photography', label: 'Fotografía' },
  { value: 'video', label: 'Video' },
  { value: 'photo_video', label: 'Foto y Video' },
  { value: 'music_dj', label: 'Música / DJ' },
  { value: 'live_band', label: 'Banda en vivo' },
  { value: 'mc_animacion', label: 'Maestro de ceremonia / Animación' },
  { value: 'lighting_sound', label: 'Luces y sonido' },
  { value: 'florist', label: 'Flores / Floristería' },
  { value: 'decor_rentals', label: 'Decoración / Alquileres' },
  { value: 'catering', label: 'Catering / Banquete' },
  { value: 'cake_desserts', label: 'Torta y Postres' },
  { value: 'bar_beverages', label: 'Bar y Bebidas' },
  { value: 'beauty', label: 'Maquillaje y peinado' },
  { value: 'attire', label: 'Vestuario y accesorios' },
  { value: 'officiant', label: 'Oficiante' },
  { value: 'transport', label: 'Transporte' },
  { value: 'security', label: 'Seguridad' },
  { value: 'kids_babysitting', label: 'Niñera / Zona infantil' },
  { value: 'venue', label: 'Lugar / Venue' },
  { value: 'invitations', label: 'Invitaciones / Papelería' },
  { value: 'photobooth', label: 'Cabina de fotos' },
  { value: 'fireworks', label: 'Pirotecnia' },
  { value: 'av_production', label: 'Producción / A.V.' },
  { value: 'other', label: 'Otro' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baja' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
];

const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// suma meses conservando (en lo posible) el día del mes
const addMonths = (base, n) => {
  const d = new Date(base);
  const day = d.getDate();
  d.setMonth(d.getMonth() + n);
  // Clamp: si el mes destino no tiene ese día (p.e. 31 → feb), retrocede
  while (d.getDate() < day) {
    d.setDate(d.getDate() - 1);
  }
  d.setHours(0, 0, 0, 0);
  return d;
};

// reparte un total en n cuotas (2 decimales), última ajusta el remanente
const splitEven = (total, n) => {
  const T = Math.max(0, Number(total || 0));
  const N = Math.max(1, Number(n || 1));
  const base = Math.floor((T / N) * 100) / 100;
  const arr = Array.from({ length: N }, () => base);
  const used = base * N;
  const remainder = Math.round((T - used) * 100) / 100;
  arr[arr.length - 1] = Math.round((arr[arr.length - 1] + remainder) * 100) / 100;
  return arr;
};

function InnerForm({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  providers = [],
  teamMembers = [],
  scheduleRows = [],
  setScheduleRows,
}) {
  // 🔄 sincroniza con el formData cuando se abre para EDITAR
  const [unitCost, setUnitCost] = useState(Number(formData.unit_cost ?? 0));
  const [quantity, setQuantity] = useState(Number(formData.quantity ?? 1));

  useEffect(() => {
    // Si cambia el formData (abrir otro ítem o editar), sincroniza
    setUnitCost(Number(formData.unit_cost ?? 0));
    setQuantity(Number(formData.quantity ?? 1));
  }, [formData.unit_cost, formData.quantity, formData.name, formData.category, formData.description]);

  // Total calculado = unitario * cantidad
  const totalCalculated = useMemo(() => {
    const u = Number(unitCost || 0);
    const q = Number(quantity || 0);
    return Math.max(0, Math.round(u * q * 100) / 100);
  }, [unitCost, quantity]);

  // Sincroniza formData.actual_cost con el total calculado + guarda unit/qty/desc
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      actual_cost: totalCalculated,
      unit_cost: unitCost,
      quantity,
      description: prev.description ?? formData.description ?? '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCalculated, unitCost, quantity]);

  // Asegurar al menos 1 cuota por defecto con el total (solo si viene vacío)
  useEffect(() => {
    if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) {
      const firstDate = new Date(); // hoy para la primera
      setScheduleRows([
        {
          amount: totalCalculated,
          due_date: toYMD(firstDate),
          priority: 'medium',
          assignee_team_id: null,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si solo hay 1 cuota, mantener su monto = total para que siempre represente el total
  useEffect(() => {
    if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) return;
    if (scheduleRows.length === 1) {
      const [only] = scheduleRows;
      if (Number(only.amount || 0) !== Number(totalCalculated)) {
        const copy = [{ ...only, amount: totalCalculated }];
        setScheduleRows(copy);
      }
    }
  }, [totalCalculated, scheduleRows, setScheduleRows]);

  // ➕ Agregar cuota: fecha = +1 mes de la última y reparto automático
  const addInstallment = () => {
    const list = Array.isArray(scheduleRows) ? [...scheduleRows] : [];
    const last = list[list.length - 1];

    const lastDate = last?.due_date ? new Date(last.due_date) : new Date();
    const nextDate = addMonths(lastDate, 1);

    list.push({
      amount: 0, // luego se reparte automáticamente
      due_date: toYMD(nextDate),
      priority: 'medium',
      assignee_team_id: null,
    });

    // repartir totalCalculated entre todas las cuotas
    const parts = splitEven(totalCalculated, list.length);
    const rebalanced = list.map((r, i) => ({ ...r, amount: parts[i] }));
    setScheduleRows(rebalanced);
  };

  const removeInstallment = (idx) => {
    const v = [...(scheduleRows || [])];
    v.splice(idx, 1);
    setScheduleRows(v);
  };

  // Totales de cuotas (para info)
  const totalBySchedule = useMemo(
    () => (scheduleRows || []).reduce((sum, r) => sum + Number(r.amount || 0), 0),
    [scheduleRows]
  );

  // ====== Calculadora detallada de reparto (solo informativa) ======
  const calc = useMemo(() => {
    const n = Math.max(1, (scheduleRows || []).length);
    const suggested = splitEven(totalCalculated, n);
    const diff = Math.round((totalBySchedule - totalCalculated) * 100) / 100;
    const rows = (scheduleRows || []).map((r, i) => ({
      current: Number(r.amount || 0),
      suggested: suggested[i],
      delta: Math.round(((Number(r.amount || 0) - suggested[i])) * 100) / 100,
    }));
    return { n, suggested, diff, rows };
  }, [scheduleRows, totalCalculated, totalBySchedule]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }} className="space-y-4">
      {/* Contenedor con scroll para evitar corte */}
      <div className="max-h-[75vh] overflow-y-auto pr-1 space-y-4">
        {/* Fila: Categoría + Nombre */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Categoría</label>
            <select
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full p-3 rounded bg-white text-gray-900 border border-white/20"
            >
              <option value="">Selecciona una categoría</option>
              {SERVICE_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Gasto</label>
            <input
              type="text"
              placeholder="Ej: Flores"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full p-3 rounded bg-white/10 border border-white/20"
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Descripción</label>
          <textarea
            rows={3}
            placeholder="Detalles del gasto, condiciones, notas…"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-3 rounded bg-white/10 border border-white/20"
          />
        </div>

        {/* Fila: Proveedor + (costo unitario, cantidad, total) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Proveedor</label>
            <select
              value={formData.provider_id || ''}
              onChange={(e) => setFormData({ ...formData, provider_id: e.target.value || null })}
              className="w-full p-3 rounded bg-white text-gray-900 border border-white/20"
            >
              <option value="">Sin proveedor</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Costo unitario</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value || 0))}
              className="w-full p-3 rounded bg-white/10 border border-white/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Cantidad</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value || 0))}
              className="w-full p-3 rounded bg-white/10 border border-white/20"
            />
          </div>
        </div>

        {/* Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-start-2">
            <div className="text-sm text-gray-300">Total (unitario × cantidad)</div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('es-CO').format(totalCalculated)}
            </div>
            <div className="text-xs text-gray-400">Este total se usa como "Costo real" del gasto.</div>
          </div>
        </div>

        {/* Calendario de pagos (por cuotas) */}
        <div className="border-t border-white/20 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold">Calendario de pagos</h4>
            <Button type="button" onClick={addInstallment} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" /> Agregar cuota
            </Button>
          </div>

          <div className="space-y-2">
            {(scheduleRows || []).map((row, idx) => (
              <div key={idx} className="grid md:grid-cols-6 gap-2 items-center bg-white/5 p-2 rounded border border-white/10">
                <div className="text-sm text-gray-300">Cuota {idx + 1}</div>

                {/* Monto */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => {
                    const v = [...scheduleRows];
                    v[idx].amount = Number(e.target.value || 0);
                    setScheduleRows(v);
                  }}
                  className="p-2 rounded bg-white/10 border border-white/20"
                  placeholder="Monto"
                />

                {/* Fecha */}
                <input
                  type="date"
                  value={row.due_date}
                  onChange={(e) => {
                    const v = [...scheduleRows];
                    v[idx].due_date = e.target.value;
                    setScheduleRows(v);
                  }}
                  className="p-2 rounded bg-white/10 border border-white/20"
                  style={{ colorScheme: 'dark' }}
                />

                {/* Prioridad (por cuota) */}
                <select
                  value={row.priority || ''}
                  onChange={(e) => {
                    const v = [...scheduleRows];
                    v[idx].priority = e.target.value || null;
                    setScheduleRows(v);
                  }}
                  className="p-2 rounded bg-white text-gray-900 border border-white/20"
                >
                  <option value="">Prioridad</option>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* Responsable (por cuota) */}
                <select
                  value={row.assignee_team_id || ''}
                  onChange={(e) => {
                    const v = [...scheduleRows];
                    v[idx].assignee_team_id = e.target.value || null;
                    setScheduleRows(v);
                  }}
                  className="p-2 rounded bg-white text-gray-900 border border-white/20"
                >
                  <option value="">Responsable</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>

                {/* Eliminar */}
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400"
                    onClick={() => removeInstallment(idx)}
                    title="Eliminar cuota"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {(!scheduleRows || scheduleRows.length === 0) && (
              <p className="text-sm text-gray-400">No hay cuotas configuradas.</p>
            )}

            {/* Calculadora detallada / Total por cuotas */}
            <div className="mt-3 rounded-md bg-white/5 border border-white/10 p-3 text-xs">
              <div className="flex flex-wrap gap-3">
                <div>Total calculado: <span className="font-semibold text-white">
                  {new Intl.NumberFormat('es-CO').format(totalCalculated)}</span>
                </div>
                <div>Cuotas: <span className="font-semibold text-white">{calc.n}</span></div>
                <div>Sugerido por cuota: <span className="font-semibold text-white">
                  {new Intl.NumberFormat('es-CO').format(calc.suggested[0] ?? 0)}</span>
                </div>
                <div>Total por cuotas: <span className="font-semibold text-white">
                  {new Intl.NumberFormat('es-CO').format(totalBySchedule)}</span>
                </div>
                {calc.diff !== 0 && (
                  <div className={calc.diff > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                    {calc.diff > 0 ? 'Sobrepasa' : 'Faltan'} {new Intl.NumberFormat('es-CO').format(Math.abs(calc.diff))} para igualar el total.
                  </div>
                )}
              </div>

              {calc.rows.length > 0 && (
                <div className="mt-2 space-y-1">
                  {calc.rows.map((r, i) => (
                    <div key={i} className="flex justify-between text-gray-200">
                      <span>Cuota {i + 1}</span>
                      <span className="text-gray-300">
                        Actual: <span className="text-white font-semibold">
                          {new Intl.NumberFormat('es-CO').format(r.current)}</span>
                        {'  '}| Sugerido: <span className="text-white font-semibold">
                          {new Intl.NumberFormat('es-CO').format(r.suggested)}</span>
                        {r.delta !== 0 && (
                          <span className={`ml-2 ${r.delta > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                            ({r.delta > 0 ? '+' : ''}{new Intl.NumberFormat('es-CO').format(r.delta)})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700">Guardar Gasto</Button>
      </DialogFooter>
    </form>
  );
}

export default function BudgetFormModal({
  open,
  onOpenChange,
  title = 'Crear Gasto',
  formData,
  setFormData,
  providers,
  teamMembers,
  scheduleRows,
  setScheduleRows,
  onSubmit,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-green-500 text-white max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        <InnerForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          providers={providers}
          teamMembers={teamMembers}
          scheduleRows={scheduleRows}
          setScheduleRows={setScheduleRows}
        />
      </DialogContent>
    </Dialog>
  );
}
