// src/components/planner/BudgetFormModal.jsx
// - Estética alineada con TaskFormModal: fondo blanco, texto oscuro, inputs con borde gris y focus vino.
// - Fix UX: inputs numéricos permiten borrar "0" (estado string) y se parsean solo para cálculos.

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import CategorySelect from '@/components/common/CategorySelect';

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
  // Estilos de inputs como TaskFormModal
  const inputCls =
    'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-[#1E1E1E] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#9E7977] focus:border-transparent';

  // 🔄 sincroniza con el formData cuando se abre para EDITAR (manejo string para permitir borrar "0")
  const [unitCostInput, setUnitCostInput] = useState(
    formData.unit_cost !== undefined && formData.unit_cost !== null ? String(formData.unit_cost) : ''
  );
  const [quantityInput, setQuantityInput] = useState(
    formData.quantity !== undefined && formData.quantity !== null ? String(formData.quantity) : ''
  );

  useEffect(() => {
    // Si cambia el formData (abrir otro ítem o editar), sincroniza
    setUnitCostInput(
      formData.unit_cost !== undefined && formData.unit_cost !== null ? String(formData.unit_cost) : ''
    );
    setQuantityInput(
      formData.quantity !== undefined && formData.quantity !== null ? String(formData.quantity) : ''
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.unit_cost, formData.quantity, formData.name, formData.category, formData.description]);

  // Total calculado = unitario * cantidad (parsear string -> número solo aquí)
  const totalCalculated = useMemo(() => {
    const u = Number(unitCostInput || 0);
    const q = Number(quantityInput || 0);
    return Math.max(0, Math.round(u * q * 100) / 100);
  }, [unitCostInput, quantityInput]);

  // Sincroniza formData.actual_cost + guarda unit/qty/desc como número
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      actual_cost: totalCalculated,
      unit_cost: Number(unitCostInput || 0),
      quantity: Number(quantityInput || 0),
      description: prev.description ?? formData.description ?? '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCalculated, unitCostInput, quantityInput]);

  // Asegurar al menos 1 cuota por defecto (monto vacío para mejor UX)
  useEffect(() => {
    if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) {
      const firstDate = new Date(); // hoy para la primera
      setScheduleRows([
        {
          amount: '', // ⟵ vacío (no 0)
          due_date: toYMD(firstDate),
          priority: 'medium',
          assignee_team_id: null,
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si solo hay 1 cuota, mantener su monto = total cuando total > 0; si no, dejar vacío
  useEffect(() => {
    if (!Array.isArray(scheduleRows) || scheduleRows.length === 0) return;
    if (scheduleRows.length === 1) {
      const [only] = scheduleRows;
      const desired = totalCalculated > 0 ? totalCalculated : '';
      if (String(only.amount ?? '') !== String(desired)) {
        setScheduleRows([{ ...only, amount: desired }]);
      }
    }
  }, [totalCalculated, scheduleRows, setScheduleRows]);

  // ➕ Agregar cuota: fecha = +1 mes de la última; si total > 0, repartir; si no, dejar vacías
  const addInstallment = () => {
    const list = Array.isArray(scheduleRows) ? [...scheduleRows] : [];
    const last = list[list.length - 1];

    const lastDate = last?.due_date ? new Date(last.due_date) : new Date();
    const nextDate = addMonths(lastDate, 1);

    list.push({
      amount: '', // ⟵ vacío (no 0)
      due_date: toYMD(nextDate),
      priority: 'medium',
      assignee_team_id: null,
    });

    if (totalCalculated > 0) {
      const parts = splitEven(totalCalculated, list.length);
      const rebalanced = list.map((r, i) => ({ ...r, amount: parts[i] }));
      setScheduleRows(rebalanced);
    } else {
      setScheduleRows(list);
    }
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
            {/* CategorySelect maneja su propio label; mantenemos consistencia de Task */}
            <CategorySelect
              label="Categoría"
              value={formData.category_id || ''}
              onChange={(id) => setFormData({ ...formData, category_id: id })}
              allowCreate
              showParentOption
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Nombre del Gasto</label>
            <input
              type="text"
              placeholder="Ej: Flores"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className={inputCls}
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm text-gray-700 mb-1">Descripción</label>
          <textarea
            rows={3}
            placeholder="Detalles del gasto, condiciones, notas…"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={inputCls}
          />
        </div>

        {/* Fila: Proveedor + (costo unitario, cantidad, total) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Proveedor</label>
            <select
              value={formData.provider_id || ''}
              onChange={(e) => setFormData({ ...formData, provider_id: e.target.value || null })}
              className={inputCls}
            >
              <option value="">Sin proveedor</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Costo unitario</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={unitCostInput}
              onChange={(e) => setUnitCostInput(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Cantidad</label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="1"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {/* Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-start-2">
            <div className="text-sm text-gray-600">Total (unitario × cantidad)</div>
            <div className="text-2xl font-bold text-[#1E1E1E]">
              {new Intl.NumberFormat('es-CO').format(totalCalculated)}
            </div>
            <div className="text-xs text-gray-500">Este total se usa como "Costo real" del gasto.</div>
          </div>
        </div>

        {/* Calendario de pagos (por cuotas) */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-[#1E1E1E]">Calendario de pagos</h4>
            <Button type="button" onClick={addInstallment} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" /> Agregar cuota
            </Button>
          </div>

          <div className="space-y-2">
            {(scheduleRows || []).map((row, idx) => (
              <div key={idx} className="grid md:grid-cols-6 gap-2 items-center bg-white p-2 rounded border border-gray-200">
                <div className="text-sm text-gray-700">Cuota {idx + 1}</div>

                {/* Monto */}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount ?? ''}
                  onChange={(e) => {
                    const v = [...scheduleRows];
                    v[idx].amount = e.target.value; // permitir vacío; se parsea con Number() en cálculos
                    setScheduleRows(v);
                  }}
                  className={inputCls}
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
                  className={inputCls}
                />

                {/* Prioridad (por cuota) */}
                <select
                  value={row.priority || ''}
                  onChange={(e) => {
                    const v = [...scheduleRows];
                    v[idx].priority = e.target.value || null;
                    setScheduleRows(v);
                  }}
                  className={inputCls}
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
                  className={inputCls}
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
              <p className="text-sm text-gray-500">No hay cuotas configuradas.</p>
            )}

            {/* Calculadora detallada / Total por cuotas */}
            <div className="mt-3 rounded-md bg-white border border-gray-200 p-3 text-xs">
              <div className="flex flex-wrap gap-3">
                <div>Total calculado: <span className="font-semibold text-[#1E1E1E]">
                  {new Intl.NumberFormat('es-CO').format(totalCalculated)}</span>
                </div>
                <div>Cuotas: <span className="font-semibold text-[#1E1E1E]">{calc.n}</span></div>
                <div>Sugerido por cuota: <span className="font-semibold text-[#1E1E1E]">
                  {new Intl.NumberFormat('es-CO').format(calc.suggested[0] ?? 0)}</span>
                </div>
                <div>Total por cuotas: <span className="font-semibold text-[#1E1E1E]">
                  {new Intl.NumberFormat('es-CO').format(totalBySchedule)}</span>
                </div>
                {calc.diff !== 0 && (
                  <div className={calc.diff > 0 ? 'text-amber-600' : 'text-emerald-700'}>
                    {calc.diff > 0 ? 'Sobrepasa' : 'Faltan'} {new Intl.NumberFormat('es-CO').format(Math.abs(calc.diff))} para igualar el total.
                  </div>
                )}
              </div>

              {calc.rows.length > 0 && (
                <div className="mt-2 space-y-1">
                  {calc.rows.map((r, i) => (
                    <div key={i} className="flex justify-between text-gray-700">
                      <span>Cuota {i + 1}</span>
                      <span className="text-gray-600">
                        Actual: <span className="text-[#1E1E1E] font-semibold">
                          {new Intl.NumberFormat('es-CO').format(r.current)}</span>
                        {'  '}| Sugerido: <span className="text-[#1E1E1E] font-semibold">
                          {new Intl.NumberFormat('es-CO').format(r.suggested)}</span>
                        {r.delta !== 0 && (
                          <span className={`ml-2 ${r.delta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
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

      <DialogFooter className="mt-6 border-t border-gray-200 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="text-gray-200">Cancelar</Button>
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
      <DialogContent className="bg-white text-[#1E1E1E] max-w-3xl">
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
