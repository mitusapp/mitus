// src/components/profile/TasksPaymentsSummary.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Hourglass,
  AlertTriangle,
  Wallet,
  TrendingUp,
} from 'lucide-react';

/* =========================
   Utils de fechas/moneda
   ========================= */
const asLocalDay = (d) => {
  if (!d) return null;
  const dd = typeof d === 'string' ? new Date(d.replace(/-/g, '/')) : new Date(d);
  if (Number.isNaN(dd.getTime())) return null;
  dd.setHours(0, 0, 0, 0);
  return dd;
};

const todayStart = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
};

const endOfMonth = (base) => {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (base, n) => {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
};

const addMonths = (base, n) => {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
};

const fmtMoney = (num, currency = 'COP', locale = 'es-CO') => {
  const n = Number(num || 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  } catch {
    return `$${n.toLocaleString(locale)}`;
  }
};

/* =========================
   Periodos soportados
   ========================= */
const RANGE_OPTS = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'm6', label: '6M' },
  { key: 'year', label: 'Año' },
  { key: 'all', label: 'Todo' },
];

const computeRange = (key) => {
  const start = todayStart();
  if (key === 'today') return { start, end: addDays(start, 1) };
  if (key === 'week') return { start, end: addDays(start, 7) };
  if (key === 'month') return { start, end: endOfMonth(start) };
  if (key === 'm6') return { start, end: addMonths(start, 6) };
  if (key === 'year') return { start, end: new Date(start.getFullYear(), 11, 31, 23, 59, 59, 999) };
  return { start: null, end: null }; // all
};

const inRange = (date, range) => {
  if (!date) return false;
  if (!range.start || !range.end) return true;
  return date >= range.start && date <= range.end;
};

/* =========================
   Agregador
   ========================= */
/**
 * items: ver ProfileTasksPage (task + payment items)
 */
const aggregate = (items = [], rangeKey = 'week') => {
  const rng = computeRange(rangeKey);
  const today = todayStart();

  // Estructuras
  const rangeAgg = {
    tareas: {
      total: 0,
      porPrioridad: { alta: 0, media: 0, baja: 0 },
      responsables: {}, // name -> count
    },
    pagos: {
      totalMonto: 0,
    },
  };

  // Buckets GLOBAL (independientes del selector)
  const globalTaskBuckets = {
    vencidas: 0,
    hoy: 0,
    semana: 0,
    mes: 0,
    m6: 0,
    anio: 0,
    sinFecha: 0,
  };

  const globalPayBuckets = {
    semana: 0,
    mes: 0,
    m6: 0,
    anio: 0,
  };

  const vencidosGlobal = { tareas: 0, pagosCount: 0, pagosMonto: 0 };
  const porProveedorMap = {}; // global

  // Helpers de bucket global
  const pushTaskGlobal = (d) => {
    if (!d) { globalTaskBuckets.sinFecha += 1; return; }
    if (d < today) { globalTaskBuckets.vencidas += 1; return; }
    if (d.getTime() === today.getTime()) { globalTaskBuckets.hoy += 1; return; }
    if (d <= addDays(today, 7)) { globalTaskBuckets.semana += 1; return; }
    if (d <= endOfMonth(today)) { globalTaskBuckets.mes += 1; return; }
    if (d <= addMonths(today, 6)) { globalTaskBuckets.m6 += 1; return; }
    if (d.getFullYear() === today.getFullYear()) { globalTaskBuckets.anio += 1; return; }
  };

  const pushPayGlobal = (d, amount) => {
    const a = Number(amount || 0);
    if (!d) return;
    if (d <= addDays(today, 7) && d >= today) globalPayBuckets.semana += a;
    if (d <= endOfMonth(today) && d >= today) globalPayBuckets.mes += a;
    if (d <= addMonths(today, 6) && d >= today) globalPayBuckets.m6 += a;
    if (d.getFullYear() === today.getFullYear() && d >= today) globalPayBuckets.anio += a;
  };

  // Recorrido principal
  for (const it of items) {
    const due = asLocalDay(it.due);

    // RANGO (para totales superiores)
    if (due ? inRange(due, rng) : rangeKey === 'all') {
      if (it.kind === 'task') {
        rangeAgg.tareas.total += 1;
        if (it.prioridad === 'high') rangeAgg.tareas.porPrioridad.alta += 1;
        else if (it.prioridad === 'medium') rangeAgg.tareas.porPrioridad.media += 1;
        else rangeAgg.tareas.porPrioridad.baja += 1;

        const owner = it.owner || 'Sin responsable';
        rangeAgg.tareas.responsables[owner] = (rangeAgg.tareas.responsables[owner] || 0) + 1;
      }

      if (it.kind === 'payment') {
        rangeAgg.pagos.totalMonto += Number(it.amount || 0);
      }
    }

    // GLOBAL (siempre)
    if (it.kind === 'task') {
      pushTaskGlobal(due);
      if (due && due < today) vencidosGlobal.tareas += 1;
    }

    if (it.kind === 'payment') {
      const amt = Number(it.amount || 0);
      pushPayGlobal(due, amt);

      if (due && due < today) {
        vencidosGlobal.pagosCount += 1;
        vencidosGlobal.pagosMonto += amt;
      }
      const prov = it.provider || 'Sin proveedor';
      porProveedorMap[prov] = (porProveedorMap[prov] || 0) + amt;
    }
  }

  // Top N
  const responsablesTop = Object.entries(rangeAgg.tareas.responsables)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const porProveedor = Object.entries(porProveedorMap)
    .map(([name, monto]) => ({ name, monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  return {
    rangeKey,
    rangeAgg,
    globalTaskBuckets,
    globalPayBuckets,
    vencidosGlobal,
    porProveedor,
  };
};

/* =========================
   Componente
   ========================= */
const TasksPaymentsSummary = ({ items = [], initialRange = 'week', currency = 'COP' }) => {
  const [rangeKey, setRangeKey] = React.useState(initialRange);
  const data = React.useMemo(() => aggregate(items, rangeKey), [items, rangeKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white rounded-2xl border border-[#DCD9D6] mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#EDEAE7]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-[#F5ECFF] flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-[#7A49FF]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#1E1E1E]">Balance general</h3>
            <p className="text-xs text-[#5E5E5E]">Tareas y pagos pendientes según el periodo seleccionado</p>
          </div>
        </div>
        <div className="flex gap-2">
          {RANGE_OPTS.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={rangeKey === key ? 'default' : 'outline'}
              className={
                rangeKey === key
                  ? 'bg-gradient-to-r from-[#8ABBD6] to-[#A9D8C5] text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }
              onClick={() => setRangeKey(key)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {/* Card: Tareas pendientes (totales POR RANGO, breakdown GLOBAL para vencidas/hoy/semana) */}
        <div className="rounded-xl border border-[#E6ECEF] p-4 bg-gradient-to-br from-[#F3F8FC] to-[#F2FBF6]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5E5E5E] flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-[#8ABBD6]" />
              Tareas pendientes
            </span>
            <span className="text-2xl font-extrabold text-[#1E1E1E]">{data.rangeAgg.tareas.total}</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-[#5E5E5E]">
            <div className="rounded-md bg-white border border-[#E6ECEF] px-2 py-1">
              Alta: <span className="font-semibold text-[#1E1E1E]">{data.rangeAgg.tareas.porPrioridad.alta}</span>
            </div>
            <div className="rounded-md bg-white border border-[#E6ECEF] px-2 py-1">
              Media: <span className="font-semibold text-[#1E1E1E]">{data.rangeAgg.tareas.porPrioridad.media}</span>
            </div>
            <div className="rounded-md bg-white border border-[#E6ECEF] px-2 py-1">
              Baja: <span className="font-semibold text-[#1E1E1E]">{data.rangeAgg.tareas.porPrioridad.baja}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-[#5E5E5E]">
            <div className="flex items-center justify-between">
              <span>Vencidas</span>
              <span className="font-semibold text-[#E23D3D]">{data.globalTaskBuckets.vencidas}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Hoy</span>
              <span className="font-semibold text-[#1E1E1E]">{data.globalTaskBuckets.hoy}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Semana</span>
              <span className="font-semibold text-[#1E1E1E]">{data.globalTaskBuckets.semana}</span>
            </div>
          </div>
        </div>

        {/* Card: Pagos pendientes (monto POR RANGO, breakdown GLOBAL de semana/mes/6M/año) */}
        <div className="rounded-xl border border-[#E6ECEF] p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5E5E5E] flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[#A9D8C5]" />
              Pagos pendientes
            </span>
            <span className="text-lg font-extrabold text-[#1E1E1E]">
              {fmtMoney(data.rangeAgg.pagos.totalMonto, currency)}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#5E5E5E]">
            <div className="rounded-md bg-[#FAFAFA] border border-[#E6ECEF] px-2 py-1">
              Semana: <span className="font-semibold text-[#1E1E1E]">
                {fmtMoney(data.globalPayBuckets.semana, currency)}
              </span>
            </div>
            <div className="rounded-md bg-[#FAFAFA] border border-[#E6ECEF] px-2 py-1">
              Mes: <span className="font-semibold text-[#1E1E1E]">
                {fmtMoney(data.globalPayBuckets.mes, currency)}
              </span>
            </div>
            <div className="rounded-md bg-[#FAFAFA] border border-[#E6ECEF] px-2 py-1">
              6M: <span className="font-semibold text-[#1E1E1E]">
                {fmtMoney(data.globalPayBuckets.m6, currency)}
              </span>
            </div>
            <div className="rounded-md bg-[#FAFAFA] border border-[#E6ECEF] px-2 py-1">
              Año: <span className="font-semibold text-[#1E1E1E]">
                {fmtMoney(data.globalPayBuckets.anio, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Card: Vencidos (GLOBAL) */}
        <div className="rounded-xl border border-[#E6ECEF] p-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[#5E5E5E] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#E7B66A]" />
              Vencidos
            </span>
            <span className="text-sm font-semibold text-[#E23D3D]">
              {data.vencidosGlobal.tareas} tareas · {data.vencidosGlobal.pagosCount} pagos
            </span>
          </div>

          <div className="mt-3 text-xs text-[#5E5E5E]">
            <div className="flex items-center justify-between">
              <span>Monto vencido</span>
              <span className="font-semibold text-[#1E1E1E]">
                {fmtMoney(data.vencidosGlobal.pagosMonto, currency)}
              </span>
            </div>

            <div className="mt-3 border-t border-[#EDEAE7] pt-3">
              <div className="text-xs font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7A49FF]" />
                Top proveedores (pendiente)
              </div>

              {data.porProveedor.length === 0 ? (
                <p className="text-[#8C8C8C]">Sin datos en el periodo.</p>
              ) : (
                <ul className="space-y-1">
                  {data.porProveedor.map((p) => (
                    <li key={p.name} className="flex items-center justify-between">
                      <span className="text-[#1E1E1E]">{p.name}</span>
                      <span className="font-semibold">{fmtMoney(p.monto, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pie: responsables (POR RANGO) */}
      <div className="p-4 border-t border-[#EDEAE7]">
        <div className="text-xs font-medium text-[#5E5E5E] mb-2">Responsables con más tareas (top 5)</div>
        {Object.keys(data.rangeAgg.tareas.responsables).length === 0 ? (
          <p className="text-[#8C8C8C] text-xs">Sin datos en el periodo.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.rangeAgg.tareas.responsables)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([name, count]) => (
                <span key={name} className="text-xs bg-[#F3F8FC] border border-[#E6ECEF] px-2 py-1 rounded-md">
                  {name}: <span className="font-semibold text-[#1E1E1E]">{count}</span>
                </span>
              ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default TasksPaymentsSummary;
