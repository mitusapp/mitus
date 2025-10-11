// src/components/planner/BudgetList.jsx
// Lista basada en CUOTAS. Mantiene acciones y diseño, elimina "Estimado".
// Orden: fecha cercana -> lejana y, a igualdad, prioridad Alta > Media > Baja.

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Edit, Trash2 } from 'lucide-react';

/* ====== Utils ====== */
const fmtMoney = (n, currency = 'COP', locale = 'es-CO') => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
  } catch {
    return `$${v.toLocaleString(locale)}`;
  }
};

const parseLocalYMD = (s) => {
  if (!s) return null;
  if (typeof s === 'string') {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (m) {
      const [y, mth, d] = m[1].split('-').map(Number);
      const dt = new Date(y, mth - 1, d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    }
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const priorityChip = (p) => {
  if (!p) return <span className="text-xs text-gray-400">—</span>;
  const cls = {
    low: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-600/30',
    high: 'bg-rose-500/20 text-rose-300 border-rose-600/30',
  }[p] || 'bg-white/10 text-gray-200 border-white/20';
  const label = { low: 'Baja', medium: 'Media', high: 'Alta' }[p] || p;
  return <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
};

/** Catálogo (igual que en Tasks) para mostrar etiqueta en español */
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
const labelFromServiceType = (value) =>
  SERVICE_TYPES.find((s) => s.value === value)?.label || (value || '—');

/* ====== Componente ====== */
export default function BudgetList({
  items = [],
  paymentsByItem = {},
  schedulesByItem = {},
  teamMembers = [],
  onOpenPayments,
  onEdit,
  onDelete,
  currency = 'COP',
  locale = 'es-CO',
}) {
  const teamMap = useMemo(() => {
    const m = {};
    (teamMembers || []).forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teamMembers]);

  /** Aplana a filas por CUOTA. Si un gasto no tiene cuotas, se crea una virtual por el total. */
  const rows = useMemo(() => {
    const out = [];
    const prioWeight = { high: 3, medium: 2, low: 1, null: 0, undefined: 0 };

    for (const item of items) {
      const sched = [...(schedulesByItem[item.id] || [])].map((r, i) => ({
        ...r,
        _due: parseLocalYMD(r.due_date),
        _n: r.installment_no || i + 1,
        _amount: Number(r.amount || 0),
        _priority: r.priority ?? item.priority ?? null,
        _assignee: r.assignee_team_id ?? item.assignee_team_id ?? null,
      })).sort((a, b) => {
        // orden por installment_no si existe, si no por fecha
        if (a.installment_no && b.installment_no) return a.installment_no - b.installment_no;
        if (a._due && b._due) return a._due - b._due;
        return 0;
      });

      const totalSchedules = sched.length || 1;

      // Distribuir pagos acumulados sobre las cuotas de ese ítem
      let remainingPaid = (paymentsByItem[item.id] || []).reduce((s, p) => s + Number(p.amount || 0), 0);

      if (sched.length === 0) {
        const amount = Number(item.actual_cost || item.estimated_cost || 0);
        const covered = Math.min(remainingPaid, amount);
        const remaining = Math.max(0, amount - covered);

        out.push({
          key: `${item.id}-virt-1`,
          item,
          nOf: `1 / 1`,
          n: 1,
          amount,
          covered,
          remaining,
          due: null,
          priority: item.priority || null,
          assignee: item.assignee_team_id || null,
          prioSort: prioWeight[item.priority] ?? 0,
          providerName: item.planner_providers?.name || 'N/A',
          categoryLabel: labelFromServiceType(item.category),
          description: item.description || '',
        });
        continue;
      }

      for (const r of sched) {
        const covered = Math.min(remainingPaid, r._amount);
        const remaining = Math.max(0, r._amount - covered);
        remainingPaid = Math.max(0, remainingPaid - r._amount);

        out.push({
          key: `${item.id}-${r.id || r._n}`,
          item,
          nOf: `${r._n} / ${totalSchedules}`,
          n: r._n,
          amount: r._amount,
          covered,
          remaining,
          due: r._due,
          priority: r._priority,
          assignee: r._assignee,
          prioSort: prioWeight[r._priority] ?? 0,
          providerName: item.planner_providers?.name || 'N/A',
          categoryLabel: labelFromServiceType(item.category),
          description: item.description || '',
        });
      }
    }

    // Orden global: fecha asc (nulls al final), luego prioridad desc (alta primero)
    out.sort((a, b) => {
      if (a.due && b.due) {
        if (a.due.getTime() !== b.due.getTime()) return a.due - b.due;
      } else if (a.due && !b.due) return -1;
      else if (!a.due && b.due) return 1;

      // prioridad: alta > media > baja
      return (b.prioSort - a.prioSort);
    });

    return out;
  }, [items, schedulesByItem, paymentsByItem]);

  return (
    <div className="rounded border border-white/10 overflow-x-auto">
      <table className="w-full text-sm min-w-[1080px]">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="text-left p-3 font-medium">Gasto</th>
            <th className="text-left p-3 font-medium">Proveedor</th>
            <th className="text-left p-3 font-medium">Prioridad</th>
            <th className="text-left p-3 font-medium">Responsable</th>
            <th className="text-left p-3 font-medium">Cuotas</th>
            <th className="text-left p-3 font-medium">Próx. venc.</th>
            {/* Estimado eliminado */}
            <th className="text-left p-3 font-medium">Real</th>
            <th className="text-left p-3 font-medium">Pagado</th>
            <th className="text-left p-3 font-medium">Pendiente</th>
            <th className="text-right p-3 font-medium">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const assigneeName = row.assignee ? (teamMembers.find(t => t.id === row.assignee)?.name || '—') : '—';

            return (
              <tr key={row.key} className="border-b border-white/10 hover:bg-white/5">
                {/* Gasto: nombre, categoría (label ES) y descripción */}
                <td className="p-3 align-top">
                  <div className="font-medium text-white">{row.item.name}</div>
                  <div className="text-xs text-gray-300">{row.categoryLabel}</div>
                  {row.description ? (
                    <div className="text-xs text-gray-400 mt-0.5">{row.description}</div>
                  ) : null}
                </td>

                <td className="p-3 text-sm text-blue-300">{row.providerName}</td>
                <td className="p-3">{priorityChip(row.priority)}</td>
                <td className="p-3 text-gray-200">{assigneeName}</td>

                {/* Cuota actual y total */}
                <td className="p-3 text-gray-200">#{row.nOf}</td>

                {/* Fecha de vencimiento de ESTA cuota */}
                <td className="p-3 text-gray-200">{row.due ? row.due.toLocaleDateString() : '—'}</td>

                {/* Estimado eliminado -> mostramos directamente el monto de la cuota */}
                <td className="p-3">{fmtMoney(row.amount, currency, locale)}</td>

                {/* Pagado aplicado a ESTA cuota (según prorrateo secuencial) */}
                <td className="p-3 text-green-300">{fmtMoney(row.covered, currency, locale)}</td>

                {/* Pendiente de ESTA cuota */}
                <td className={`p-3 ${row.remaining > 0 ? 'text-orange-300' : 'text-gray-300'}`}>
                  {fmtMoney(row.remaining, currency, locale)}
                </td>

                {/* Acciones siguen apuntando al ITEM (no a la cuota) */}
                <td className="p-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      onClick={() => onOpenPayments?.(row.item)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-green-400"
                      title="Pagos"
                    >
                      <CreditCard className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onEdit?.(row.item)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-blue-400"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => onDelete?.(row.item.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="p-6 text-center text-gray-400">
                No hay gastos registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
