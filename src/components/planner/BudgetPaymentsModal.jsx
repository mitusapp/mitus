// src/components/planner/BudgetPaymentsModal.jsx (responsive + autosugerencia + validación)
// Objetivo: Mostrar cuotas programadas junto a los pagos, sugerir el siguiente pago
// automáticamente y validar que el monto no exceda el pendiente.

import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Trash2, AlertTriangle } from 'lucide-react';

/* ========================= Utils ========================= */
const fmtMoney = (n, currency = 'COP', locale = 'es-CO') => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
  } catch {
    return `$${v.toLocaleString(locale)}`;
  }
};

// Parse local-safe for 'YYYY-MM-DD' or Date
const asLocalDay = (d) => {
  if (!d) return null;
  if (d instanceof Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  if (typeof d === 'string') {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const yy = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      const x = new Date(yy, mm - 1, dd);
      x.setHours(0, 0, 0, 0);
      return x;
    }
  }
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return null;
  x.setHours(0, 0, 0, 0);
  return x;
};

/* ========================= Inner ========================= */
function Inner({
  budgetItem,
  payments = [],
  schedules = [], // cuotas programadas para este gasto
  teamMembers = [],
  onAddPayment,
  onDeletePayment,
  onClose,
  currency = 'COP',
  locale = 'es-CO',
}) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [autoSuggested, setAutoSuggested] = useState(false);

  const teamMap = useMemo(() => {
    const m = {};
    (teamMembers || []).forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teamMembers]);

  const totals = useMemo(() => {
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const base = Number(budgetItem?.actual_cost || budgetItem?.estimated_cost || 0);
    const scheduled = (schedules || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    return { base, scheduled, totalPaid, remaining: base - totalPaid };
  }, [payments, schedules, budgetItem]);

  // Derivados por cuota: estado en función del pagado acumulado
  const scheduleRows = useMemo(() => {
    const rows = [...(schedules || [])]
      .map((r, i) => ({
        ...r,
        _due: asLocalDay(r.due_date),
        _n: r.installment_no || i + 1,
        _amount: Number(r.amount || 0),
      }))
      .sort((a, b) => {
        if (a.installment_no && b.installment_no) return a.installment_no - b.installment_no;
        if (a._due && b._due) return a._due - b._due;
        return a._n - b._n;
      });

    let cumScheduled = 0;
    const paid = Number(totals.totalPaid || 0);
    const today = asLocalDay(new Date());

    return rows.map((r) => {
      cumScheduled += r._amount;
      const covered = Math.max(0, Math.min(r._amount, paid - (cumScheduled - r._amount)));
      const remainingThis = Math.max(0, r._amount - covered);
      const fullyPaid = paid + 1e-6 >= cumScheduled;
      const overdue = !fullyPaid && r._due && today && r._due < today;

      let status = 'Pendiente';
      if (fullyPaid) status = 'Pagada';
      else if (overdue) status = 'Vencida';

      return { ...r, _covered: covered, _remaining: remainingThis, _cum: cumScheduled, _status: status };
    });
  }, [schedules, totals.totalPaid]);

  // Monto sugerido (primera cuota con remanente)
  const nextSuggestion = useMemo(() => {
    const next = scheduleRows.find((r) => r._status !== 'Pagada');
    if (!next) return 0;
    return Math.max(0, Number(next._remaining || 0));
  }, [scheduleRows]);

  // 2) Autocompletar monto con la próxima cuota al abrir (sin botón)
  useEffect(() => {
    if (!autoSuggested && nextSuggestion > 0) {
      setAmount(String(nextSuggestion));
      setAutoSuggested(true);
    }
  }, [nextSuggestion, autoSuggested]);

  // 3) Validar que el pago no exceda el pendiente
  const add = () => {
    const val = Number(amount);
    const remaining = Math.max(0, Number(totals.remaining || 0));
    if (!paymentDate || !(val > 0)) return;
    if (val > remaining + 0.005) {
      window.alert(`El monto ingresado (${fmtMoney(val, currency, locale)}) excede el pendiente (${fmtMoney(remaining, currency, locale)}).`);
      return;
    }
    onAddPayment?.({ budget_item_id: budgetItem?.id, amount: val, payment_date: paymentDate });
    setAmount('');
  };

  const scheduleMismatch = Math.abs(Number(totals.base || 0) - Number(totals.scheduled || 0)) > 0.01;

  return (
    <div className="py-2">
      {/* ===== Resumen rápido ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="rounded-md bg-white/5 border border-white/10 p-2">
          <div className="text-xs text-gray-300">Total</div>
          <div className="font-semibold">{fmtMoney(totals.base, currency, locale)}</div>
        </div>
        <div className="rounded-md bg-white/5 border border-white/10 p-2">
          <div className="text-xs text-gray-300">Programado</div>
          <div className="font-semibold">{fmtMoney(totals.scheduled, currency, locale)}</div>
        </div>
        <div className="rounded-md bg-white/5 border border-white/10 p-2">
          <div className="text-xs text-gray-300">Pagado</div>
          <div className="font-semibold text-green-300">{fmtMoney(totals.totalPaid, currency, locale)}</div>
        </div>
        <div className="rounded-md bg-white/5 border border-white/10 p-2">
          <div className="text-xs text-gray-300">Pendiente</div>
          <div className="font-semibold text-amber-300">{fmtMoney(totals.remaining, currency, locale)}</div>
        </div>
      </div>
      {scheduleMismatch && (
        <div className="flex items-center gap-2 text-xs text-amber-200 mb-3 bg-amber-500/10 border border-amber-400/30 rounded px-2 py-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          La suma de cuotas no coincide con el total. Puedes ajustar los montos en el editor del gasto.
        </div>
      )}

      {/* ===== Cuotas programadas ===== */}
      <div className="mb-3">
        <h4 className="font-semibold mb-2">Cuotas programadas</h4>
        <div className="space-y-2 max-h-[32vh] overflow-auto pr-1">
          {scheduleRows.length === 0 && (
            <p className="text-sm text-gray-400">No hay cuotas configuradas para este gasto.</p>
          )}
          {scheduleRows.map((r) => (
            <div key={r.id || r._n} className="bg-white/5 border border-white/10 rounded p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border border-white/20 bg-white/10 text-gray-200">
                  #{r._n}
                </span>
                <span className="text-sm text-white font-medium">{fmtMoney(r._amount, currency, locale)}</span>
                <span className="text-xs text-gray-300">· {r._due ? r._due.toLocaleDateString() : 'Sin fecha'}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${
                  r._status === 'Pagada'
                    ? 'bg-green-500/15 text-green-200 border-green-600/30'
                    : r._status === 'Vencida'
                    ? 'bg-rose-500/15 text-rose-200 border-rose-600/30'
                    : 'bg-amber-500/15 text-amber-200 border-amber-600/30'
                }`}>
                  {r._status}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-gray-300">
                <div>
                  {r.priority ? <span className="mr-3">Prioridad: {r.priority}</span> : null}
                  {r.assignee_team_id ? <span>Responsable: {teamMap[r.assignee_team_id] || r.assignee_team_id}</span> : null}
                </div>
                <div>
                  {r._remaining > 0 && r._status !== 'Pagada' ? (
                    <span>Pendiente en cuota: <span className="text-white font-medium">{fmtMoney(r._remaining, currency, locale)}</span></span>
                  ) : (
                    <span className="text-green-300">Cubre la cuota</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Pagos registrados ===== */}
      <div className="mb-3">
        <h4 className="font-semibold mb-2">Pagos registrados</h4>
        <div className="space-y-2 max-h-[28vh] overflow-auto pr-1">
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
              <span>
                {fmtMoney(p.amount, currency, locale)} · {asLocalDay(p.payment_date)?.toLocaleDateString()}
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-red-400" onClick={() => onDeletePayment?.(p.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {payments.length === 0 && (
            <p className="text-sm text-gray-400 text-center">No hay pagos registrados.</p>
          )}
        </div>
      </div>

      {/* ===== Añadir pago ===== */}
      <div className="border-t border-white/20 pt-3 mt-2 space-y-2">
        <h4 className="font-semibold">Añadir pago</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="Monto"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            min="0"
            step="0.01"
          />
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full p-2 rounded bg-white/10 border border-white/20"
            style={{ colorScheme: 'dark' }}
          />
          <div className="flex gap-2">
            <Button onClick={add} className="w-full bg-green-600 hover:bg-green-700">Añadir Pago</Button>
          </div>
        </div>
      </div>

      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      </DialogFooter>
    </div>
  );
}

/* ========================= Wrapper ========================= */
export default function BudgetPaymentsModal({
  open,
  onOpenChange,
  budgetItem,
  payments,
  schedules = [],
  teamMembers = [],
  onAddPayment,
  onDeletePayment,
  currency = 'COP',
  locale = 'es-CO',
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-slate-800/90 backdrop-blur-sm border-green-500 text-white
                   w-[96vw] sm:w-[90vw] md:w-auto sm:max-w-lg md:max-w-2xl
                   max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Pagos para: {budgetItem?.name}</DialogTitle>
        </DialogHeader>
        <Inner
          budgetItem={budgetItem}
          payments={payments || []}
          schedules={schedules || []}
          teamMembers={teamMembers || []}
          onAddPayment={(p) => onAddPayment?.(p)}
          onDeletePayment={onDeletePayment}
          onClose={() => onOpenChange(false)}
          currency={currency}
          locale={locale}
        />
      </DialogContent>
    </Dialog>
  );
}
