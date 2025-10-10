// src/components/planner/TasksSummary.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  CalendarDays,
  Hourglass,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

/* =========================
   Utils de fechas
   ========================= */
const asLocalDay = (d) => {
  if (!d) return null;

  if (d instanceof Date) {
    if (Number.isNaN(d.getTime())) return null;
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd;
  }

  if (typeof d === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split('-').map(Number);
      const dd = new Date(y, m - 1, day);
      dd.setHours(0, 0, 0, 0);
      return dd;
    }
    const dd = new Date(d);
    if (Number.isNaN(dd.getTime())) return null;
    dd.setHours(0, 0, 0, 0);
    return dd;
  }

  return null;
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
   Agregador SOLO tareas
   items: { due, prioridad: 'high'|'medium'|'low', status: 'pending'|'in_progress'|'completed', owner: 'Nombre' }
   ========================= */
const aggregateTasks = (items = [], rangeKey = 'week') => {
  const rng = computeRange(rangeKey);
  const today = todayStart();

  const rangeAgg = {
    total: 0,
    porPrioridad: { alta: 0, media: 0, baja: 0 },
    porEstado: { pending: 0, in_progress: 0, completed: 0 },
    responsables: {},
  };

  const globalBuckets = {
    vencidas: 0,
    hoy: 0,
    semana: 0,
    mes: 0,
    m6: 0,
    anio: 0,
    sinFecha: 0,
  };

  const overdueByOwner = {};
  let overdueInRange = 0;

  const pushGlobal = (d) => {
    if (!d) { globalBuckets.sinFecha += 1; return; }
    if (d < today) { globalBuckets.vencidas += 1; return; }
    if (d.getTime() === today.getTime()) { globalBuckets.hoy += 1; return; }
    if (d <= addDays(today, 7)) { globalBuckets.semana += 1; return; }
    if (d <= endOfMonth(today)) { globalBuckets.mes += 1; return; }
    if (d <= addMonths(today, 6)) { globalBuckets.m6 += 1; return; }
    if (d.getFullYear() === today.getFullYear()) { globalBuckets.anio += 1; return; }
  };

  for (const it of items) {
    const due = asLocalDay(it.due);
    const owner = it.owner || 'Sin responsable';
    const status = it.status || 'pending';
    const pr = it.prioridad || 'low';

    // Totales por RANGO
    if (due ? inRange(due, rng) : rangeKey === 'all') {
      rangeAgg.total += 1;
      if (pr === 'high') rangeAgg.porPrioridad.alta += 1;
      else if (pr === 'medium') rangeAgg.porPrioridad.media += 1;
      else rangeAgg.porPrioridad.baja += 1;

      rangeAgg.porEstado[status] = (rangeAgg.porEstado[status] || 0) + 1;
      rangeAgg.responsables[owner] = (rangeAgg.responsables[owner] || 0) + 1;
    }

    // Globales (del evento)
    pushGlobal(due);
    if (due && due < today) {
      overdueByOwner[owner] = (overdueByOwner[owner] || 0) + 1;
      if (rangeKey === 'all' || inRange(due, rng)) overdueInRange += 1;
    }
  }

  return { rangeKey, rangeAgg, globalBuckets, overdueByOwner, overdueInRange };
};

/* =========================
   Constantes de UI (JS puro)
   ========================= */
const STATUS_ORDER = ['pending', 'in_progress', 'completed'];

/* =========================
   Componente
   ========================= */
const TasksSummary = ({ items = [], initialRange = 'week' }) => {
  const [rangeKey, setRangeKey] = React.useState(initialRange);
  const [collapsed, setCollapsed] = React.useState(false);
  const data = React.useMemo(() => aggregateTasks(items, rangeKey), [items, rangeKey]);

  const statusLabel = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completada',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 mb-6 text-white"
      aria-expanded={!collapsed}
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/30">
            <CalendarDays className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Resumen de tareas</h3>
            {!collapsed && (
              <p className="text-xs text-gray-300">Pendientes dentro del periodo seleccionado</p>
            )}
          </div>
        </div>

        {/* Acciones derecha: botones de periodo (si expandido) + botón de colapsar/expandir */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {!collapsed && (
            <div className="flex flex-wrap gap-2">
              {RANGE_OPTS.map(({ key, label }) => (
                <Button
                  key={key}
                  size="sm"
                  variant="ghost"
                  className={
                    (rangeKey === key)
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      : 'bg-white/5 border border-white/20 text-gray-200 hover:bg-white/10'
                  }
                  onClick={() => setRangeKey(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}

          {/* Botón de ocultar/mostrar justo al lado de los periodos */}
          <Button
            size="sm"
            variant="ghost"
            className="bg-white/5 border border-white/20 text-gray-200 hover:bg-white/10"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Mostrar resumen' : 'Ocultar resumen'}
          >
            {collapsed ? (
              <>
                Mostrar <ChevronDown className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Ocultar <ChevronUp className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content (solo si expandido) */}
      {!collapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            {/* Card: Tareas pendientes + prioridad + buckets cortos */}
            <div className="rounded-xl bg-white/10 border border-white/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Hourglass className="w-4 h-4 text-cyan-300" />
                  Tareas pendientes
                </span>
                <span className="text-2xl font-extrabold text-white">{data.rangeAgg.total}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-300">
                <div className="rounded-md bg-white/5 border border-white/20 px-2 py-1">
                  Alta: <span className="font-semibold text-white">{data.rangeAgg.porPrioridad.alta}</span>
                </div>
                <div className="rounded-md bg-white/5 border border-white/20 px-2 py-1">
                  Media: <span className="font-semibold text-white">{data.rangeAgg.porPrioridad.media}</span>
                </div>
                <div className="rounded-md bg-white/5 border border-white/20 px-2 py-1">
                  Baja: <span className="font-semibold text-white">{data.rangeAgg.porPrioridad.baja}</span>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Vencidas</span>
                  <span className="font-semibold text-red-300">
                    {data.overdueInRange} en el periodo · {data.globalBuckets.vencidas} en total
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hoy</span>
                  <span className="font-semibold text-white">{data.globalBuckets.hoy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Semana</span>
                  <span className="font-semibold text-white">{data.globalBuckets.semana}</span>
                </div>
              </div>
            </div>

            {/* Card: Estado de tareas (en el periodo) */}
            <div className="rounded-xl bg-white/10 border border-white/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-violet-300" />
                  Estado (periodo)
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-300">
                {STATUS_ORDER.map((st) => (
                  <div
                    key={st}
                    className="rounded-md bg-white/5 border border-white/20 px-2 py-2 flex items-center justify-between"
                  >
                    <span className="text-white">{statusLabel[st]}</span>
                    <span className="font-semibold text-white">{data.rangeAgg.porEstado[st] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card: Vencidas (del evento) */}
            <div className="rounded-xl bg-white/10 border border-white/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  Vencidas
                </span>
                <span className="text-sm font-semibold text-red-300">
                  {data.overdueInRange} en el periodo · {data.globalBuckets.vencidas} en total
                </span>
              </div>

              <div className="mt-3 text-xs text-gray-300">
                <div className="text-xs font-medium mb-2 text-white">Responsables con vencidas</div>
                {Object.keys(data.overdueByOwner).length === 0 ? (
                  <p className="text-gray-400">Sin datos.</p>
                ) : (
                  <ul className="space-y-1">
                    {Object.entries(data.overdueByOwner)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([name, count]) => (
                        <li key={name} className="flex items-center justify-between">
                          <span className="text-white">{name || 'Sin responsable'}</span>
                          <span className="font-semibold text-white">{count}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Pie: responsables (POR RANGO) */}
          <div className="p-4 border-t border-white/10">
            <div className="text-xs font-medium text-white mb-2">
              Responsables con más tareas (periodo)
            </div>
            {Object.keys(data.rangeAgg.responsables).length === 0 ? (
              <p className="text-gray-400 text-xs">Sin datos en el periodo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.rangeAgg.responsables)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([name, count]) => {
                    const total = data.rangeAgg.total || 0;
                    const pct = total ? Math.round((count * 100) / total) : 0;
                    const labelName = name || 'Sin responsable';
                    return (
                      <span
                        key={labelName}
                        className="text-xs bg-white/10 border border-white/20 px-2 py-1 rounded-md
                                   inline-flex items-center gap-1 max-w-[16rem] min-w-0 text-white"
                        title={`${labelName}: ${count} tarea(s) en el periodo (${pct}%)`}
                      >
                        <span className="truncate overflow-hidden whitespace-nowrap max-w-[9rem]">
                          {labelName}
                        </span>
                        <span className="font-semibold">· {count}</span>
                        <span className="text-gray-300">({pct}%)</span>
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default TasksSummary;
