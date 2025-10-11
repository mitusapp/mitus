// src/components/planner/BudgetSummary.jsx
// Resumen práctico centrado en: Total, Pagado, Pendiente y Alertas.
// Compatible con props anteriores (estimated/actual/paid/overdueAmount) y
// admite props opcionales para información extra (scheduledTotal, nextDue*).

import React from 'react';
import {
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';

const fmtMoney = (n, currency = 'COP', locale = 'es-CO') => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
  } catch {
    return `$${v.toLocaleString(locale)}`;
  }
};

export default function BudgetSummary({
  // Compatibilidad con versión anterior:
  estimated = 0,          // antes: suma estimada (se usa SOLO como respaldo)
  actual = 0,             // antes: suma real (ahora representa el "total" del gasto)
  paid = 0,               // suma de pagos realizados
  overdueAmount = 0,      // monto vencido (cuotas vencidas menos pagadas)

  // Opcionales (si los envías, se muestran):
  scheduledTotal,         // suma de cuotas programadas (para validar contra "total")
  nextDueAmount,          // monto de la próxima cuota pendiente
  nextDueDate,            // fecha (string o Date) de la próxima cuota pendiente
  overdueCount,           // cantidad de cuotas vencidas pendientes

  currency = 'COP',
  locale = 'es-CO',
}) {
  // Tomamos como "Total" el real si existe; si no, usamos el estimado (compatibilidad).
  const total = Number(actual || 0) || Number(estimated || 0) || 0;
  const totalPaid = Number(paid || 0);
  const pending = Math.max(0, total - totalPaid);

  const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((totalPaid * 100) / total))) : 0;

  // Diferencia Programado vs Total (solo si tenemos scheduledTotal)
  const scheduled = scheduledTotal != null ? Number(scheduledTotal) : null;
  const schedDiff = scheduled != null ? Math.abs(scheduled - total) : 0;
  const schedMismatch = scheduled != null && schedDiff > 0.01;

  const nextDateLabel = (() => {
    if (!nextDueDate) return null;
    const d = typeof nextDueDate === 'string' ? new Date(nextDueDate) : nextDueDate;
    if (Number.isNaN(d?.getTime?.())) return null;
    return d.toLocaleDateString();
  })();

  return (
    <div className="grid gap-4 mb-6 md:grid-cols-4">
      {/* Total */}
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
        <div className="text-gray-300 text-sm mb-2 flex items-center gap-2">
          <Wallet className="w-4 h-4" /> Total del presupuesto
        </div>
        <div className="text-3xl font-bold text-white leading-tight">
          {fmtMoney(total, currency, locale)}
        </div>

        {/* Si mandas scheduledTotal, mostramos validación */}
        {scheduled != null && (
          <div className={`mt-3 text-xs rounded-md border px-2 py-1 inline-flex items-center gap-2
              ${schedMismatch
                ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                : 'bg-green-500/10 border-green-400/30 text-green-200'}`}>
            {schedMismatch ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {schedMismatch
              ? <>Programado: <span className="font-semibold text-white">{fmtMoney(scheduled, currency, locale)}</span> · no coincide</>
              : <>Programado: <span className="font-semibold text-white">{fmtMoney(scheduled, currency, locale)}</span> · OK</>}
          </div>
        )}
      </div>

      {/* Pagado (con barra de progreso) */}
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
        <div className="text-gray-300 text-sm mb-2 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> Pagado
        </div>
        <div className="text-3xl font-bold text-white leading-tight">
          {fmtMoney(totalPaid, currency, locale)}
        </div>
        <div className="mt-3">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-2 bg-green-400/80"
              style={{ width: `${pct}%` }}
              aria-hidden
            />
          </div>
          <div className="mt-1 text-xs text-gray-300">{pct}% del total</div>
        </div>
      </div>

      {/* Pendiente */}
      <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
        <div className="text-gray-300 text-sm mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Pendiente por pagar
        </div>
        <div className="text-3xl font-bold text-white leading-tight">
          {fmtMoney(pending, currency, locale)}
        </div>

        {/* Próximo vencimiento si está disponible */}
        {(nextDueAmount != null || nextDateLabel) && (
          <div className="mt-3 text-xs rounded-md bg-white/5 border border-white/15 px-2 py-1 inline-flex items-center gap-2 text-gray-200">
            <CalendarClock className="w-3.5 h-3.5" />
            Próximo: {nextDateLabel ? `${nextDateLabel} · ` : ''}
            <span className="font-semibold text-white">{fmtMoney(nextDueAmount || 0, currency, locale)}</span>
          </div>
        )}
      </div>

      {/* Alertas (vencido) */}
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
        <div className="text-rose-200 text-sm mb-2 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Alertas
        </div>
        <div className="text-3xl font-bold text-white leading-tight">
          {fmtMoney(overdueAmount, currency, locale)}
        </div>
        <div className="text-xs text-rose-100 mt-1">Monto vencido</div>

        {typeof overdueCount === 'number' && (
          <div className="mt-3 text-xs text-rose-100">
            Cuotas vencidas: <span className="font-semibold text-white">{overdueCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
