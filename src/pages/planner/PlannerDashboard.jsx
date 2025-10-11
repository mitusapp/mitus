// src/pages/PlannerDashboard.jsx (paso 4 – módulos informativos con alertas)
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardList, CalendarClock, Wallet, ArrowLeft, Users, FileText, Building2,
  ChefHat, Gift, Briefcase, Image, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// Nota: Mantiene todas las funciones. Solo mejora el hub visual y agrega
// métricas/alertas dentro de cada botón de módulo. Buscador y botones rápidos: eliminados.

const tzOffset = '-05:00';
const startOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}T00:00:00${tzOffset}`;
};
const endOfTodayISO = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}T23:59:59${tzOffset}`;
};

const PlannerDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    // Top-level resumen (se mantiene)
    nextItem: null,
    pendingTasks: 0,
    budget: { estimated: 0, actual: 0 },
  });

  const [stats, setStats] = useState({
    tasks: { pending: 0, completed: 0, overdue: 0 },
    timeline: { today: 0, upcoming7: 0, nextItem: null },
    budget: { estimated: 0, actual: 0, overdueAmount: 0 },
    providers: { count: 0 },
    team: { count: 0 },
    venues: { count: 0 },
    documents: { count: 0 },
    catering: { count: 0 },
    gifts: { count: 0 },
    inspiration: { count: 0 },
  });

  const fetchSummaryAndStats = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      const sToday = startOfTodayISO();
      const eToday = endOfTodayISO();

      // 1) Tareas
      const { data: tasksData, error: tasksErr } = await supabase
        .from('planner_tasks')
        .select('id, status, due_date')
        .eq('event_id', eventId);
      if (tasksErr) throw tasksErr;
      const pending = (tasksData || []).filter(t => t.status !== 'completed').length;
      const completed = (tasksData || []).filter(t => t.status === 'completed').length;
      const overdue = (tasksData || []).filter(t => t.due_date && new Date(t.due_date) < new Date(sToday) && t.status !== 'completed').length;

      // 2) Cronograma
      const { data: tlNext } = await supabase
        .from('planner_timeline_items')
        .select('id, title, start_ts, start_date')
        .eq('event_id', eventId)
        .gt('start_ts', nowIso)
        .order('start_ts', { ascending: true })
        .limit(1);
      const nextItem = (tlNext && tlNext[0]) || null;

      const { data: tlAll } = await supabase
        .from('planner_timeline_items')
        .select('id, start_ts, start_date')
        .eq('event_id', eventId);
      const toTS = (it) => it.start_ts ? new Date(it.start_ts) : (it.start_date ? new Date(`${it.start_date}T00:00:00${tzOffset}`) : null);
      const todayCount = (tlAll || []).filter(it => { const d = toTS(it); if (!d) return false; return d >= new Date(sToday) && d <= new Date(eToday); }).length;
      const in7 = new Date(); in7.setDate(in7.getDate()+7);
      const upcoming7 = (tlAll || []).filter(it => { const d = toTS(it); if (!d) return false; return d > new Date() && d <= in7; }).length;

      // 3) Presupuesto y pagos (monto vencido)
      const { data: budgetData, error: budgetErr } = await supabase
        .from('planner_budget_items')
        .select('id, estimated_cost, actual_cost')
        .eq('event_id', eventId);
      if (budgetErr) throw budgetErr;
      const estimated = (budgetData || []).reduce((s, r) => s + Number(r.estimated_cost || 0), 0);
      const actual = (budgetData || []).reduce((s, r) => s + Number(r.actual_cost || 0), 0);
      const ids = (budgetData || []).map(b => b.id);
      let overdueAmount = 0;
      if (ids.length > 0) {
        const [{ data: pays }, { data: sched } ] = await Promise.all([
          supabase.from('planner_payments').select('budget_item_id, amount, payment_date').in('budget_item_id', ids),
          supabase.from('planner_payment_schedules').select('budget_item_id, amount, due_date').in('budget_item_id', ids),
        ]);
        const paidToDate = (pays || []).filter(p => p.payment_date && new Date(p.payment_date) <= new Date()).reduce((sum,p)=> sum + Number(p.amount || 0), 0);
        const scheduledDue = (sched || []).filter(s => s.due_date && new Date(s.due_date) < new Date(sToday)).reduce((sum,s)=> sum + Number(s.amount || 0), 0);
        overdueAmount = Math.max(0, scheduledDue - paidToDate);
      }

      // 4) Conteos simples de otros módulos
      async function safeCount(table, filter) {
        try {
          const q = supabase.from(table).select('*', { head: true, count: 'exact' });
          if (filter) filter(q);
          const res = await (filter ? filter(supabase.from(table).select('*', { head: true, count: 'exact' })) : q);
          return res.count || 0;
        } catch { return 0; }
      }

      const [providersCount, teamCount, venuesCount, docsCount, cateringCount, giftsCount, inspCount] = await Promise.all([
        safeCount('event_providers', (q) => q.eq('event_id', eventId)),
        safeCount('planner_team', (q) => q.eq('event_id', eventId)),
        safeCount('planner_venues', (q) => q.eq('event_id', eventId)),
        safeCount('planner_documents', (q) => q.eq('event_id', eventId)),
        safeCount('planner_catering_items', (q) => q.eq('event_id', eventId)),
        safeCount('planner_gifts', (q) => q.eq('event_id', eventId)),
        safeCount('planner_inspiration', (q) => q.eq('event_id', eventId)),
      ]);

      // Top summary (ligero)
      setSummary({ nextItem, pendingTasks: pending, budget: { estimated, actual } });

      setStats({
        tasks: { pending, completed, overdue },
        timeline: { today: todayCount, upcoming7: upcoming7, nextItem },
        budget: { estimated, actual, overdueAmount },
        providers: { count: providersCount },
        team: { count: teamCount },
        venues: { count: venuesCount },
        documents: { count: docsCount },
        catering: { count: cateringCount },
        gifts: { count: giftsCount },
        inspiration: { count: inspCount },
      });
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo cargar el resumen del Planner', variant: 'destructive' });
    }
  }, [eventId]);

  useEffect(() => { (async () => { setLoading(true); await fetchSummaryAndStats(); setLoading(false); })(); }, [fetchSummaryAndStats]);

  // ---------------------- UI helpers (cards diferenciadas) -------------------
  const InfoStatCard = ({ label, value, sub }) => (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <div className="text-xs text-gray-200/90">{label}</div>
      <div className="text-sm font-semibold text-white truncate">{value}</div>
      {sub ? <div className="text-xs text-gray-300">{sub}</div> : null}
    </div>
  );

  const ModuleCard = ({ icon, title, desc, path, lines = [], alert = null }) => (
    <button onClick={() => navigate(path)} className="group w-full text-left p-4 rounded-xl border border-white/25 bg-white/10 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition">
      <div className="flex items-start gap-3">
        <div className="pt-0.5">{icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-gray-200/90 mb-2">{desc}</p>
          {lines.length > 0 && (
            <ul className="text-xs text-gray-200/90 space-y-1">
              {lines.map((l, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  {l.icon ? <span className="opacity-80">{l.icon}</span> : null}
                  <span>{l.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {alert && alert.show ? (
          <div className={`ml-2 shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${alert.severity === 'danger' ? 'bg-red-500/20 text-red-200 border border-red-500/40' : 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/40'}`}>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{alert.text}</span>
            </div>
          </div>
        ) : null}
      </div>
    </button>
  );

  return (
    <div className="p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
        {/* Barra superior */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Planner</h1>
        </div>

        {/* Sección: Resumen (datos, NO botones) */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-white/80 mb-2">Resumen</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoStatCard
              label="Próximo hito"
              value={summary.nextItem ? summary.nextItem.title : '—'}
              sub={summary.nextItem ? new Date(summary.nextItem.start_ts).toLocaleString() : ''}
            />
            <InfoStatCard
              label="Tareas pendientes"
              value={<span className="text-2xl">{summary.pendingTasks}</span>}
              sub="en el plan"
            />
            <InfoStatCard
              label="Presupuesto"
              value={`$${summary.budget.actual.toLocaleString()} / $${summary.budget.estimated.toLocaleString()}`}
              sub="gastado / estimado"
            />
          </div>
        </div>

        {/* Sección: Módulos con métricas y alertas */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ModuleCard
            icon={<ClipboardList className="w-5 h-5 text-white" />}
            title="Tareas y Checklist"
            desc="Organiza pendientes, prioridades y responsables."
            path={`/host/${eventId}/planner/tasks`}
            lines={[
              { text: `Pendientes: ${stats.tasks.pending}` },
              { text: `Completadas: ${stats.tasks.completed}` },
            ]}
            alert={ stats.tasks.overdue > 0 ? { show: true, severity: 'danger', text: `Vencidas: ${stats.tasks.overdue}` } : null }
          />

          <ModuleCard
            icon={<CalendarClock className="w-5 h-5 text-white" />}
            title="Cronograma"
            desc="Run of show del evento, con horas y responsables."
            path={`/host/${eventId}/planner/timeline`}
            lines={[
              { text: `Hoy: ${stats.timeline.today}` },
              { text: `Próximos 7 días: ${stats.timeline.upcoming7}` },
              stats.timeline.nextItem ? { text: `Siguiente: ${new Date(stats.timeline.nextItem.start_ts).toLocaleString()}` } : null,
            ].filter(Boolean)}
          />

          <ModuleCard
            icon={<Wallet className="w-5 h-5 text-white" />}
            title="Presupuesto y Pagos"
            desc="Costos, pagos y seguimiento financiero."
            path={`/host/${eventId}/planner/budget`}
            lines={[
              { text: `Gastado: $${stats.budget.actual.toLocaleString()}` },
              { text: `Estimado: $${stats.budget.estimated.toLocaleString()}` },
            ]}
            alert={ stats.budget.overdueAmount > 0 ? { show: true, severity: 'danger', text: `Vencido: $${stats.budget.overdueAmount.toLocaleString()}` } : null }
          />

          <ModuleCard
            icon={<Briefcase className="w-5 h-5 text-white" />}
            title="Proveedores"
            desc="Directorio de proveedores vinculados al evento."
            path={`/host/${eventId}/planner/providers`}
            lines={[{ text: `Total: ${stats.providers.count}` }]}
          />

          <ModuleCard
            icon={<Users className="w-5 h-5 text-white" />}
            title="Equipo"
            desc="Miembros del equipo y roles asignados."
            path={`/host/${eventId}/planner/team`}
            lines={[{ text: `Miembros: ${stats.team.count}` }]}
          />

          <ModuleCard
            icon={<Building2 className="w-5 h-5 text-white" />}
            title="Lugares / Venues"
            desc="Locaciones y logística de cada espacio."
            path={`/host/${eventId}/planner/venues`}
            lines={[{ text: `Lugares: ${stats.venues.count}` }]}
          />

          <ModuleCard
            icon={<ChefHat className="w-5 h-5 text-white" />}
            title="Catering"
            desc="Menús, proveedores y detalles de servicio."
            path={`/host/${eventId}/planner/catering`}
            lines={[{ text: `Ítems: ${stats.catering.count}` }]}
          />

          <ModuleCard
            icon={<Gift className="w-5 h-5 text-white" />}
            title="Regalos"
            desc="Lista de obsequios y agradecimientos."
            path={`/host/${eventId}/planner/gifts`}
            lines={[{ text: `Regalos: ${stats.gifts.count}` }]}
          />

          <ModuleCard
            icon={<FileText className="w-5 h-5 text-white" />}
            title="Documentos"
            desc="Contratos, PDFs y archivos adjuntos."
            path={`/host/${eventId}/planner/documents`}
            lines={[{ text: `Documentos: ${stats.documents.count}` }]}
          />

          <ModuleCard
            icon={<Image className="w-5 h-5 text-white" />}
            title="Inspiración"
            desc="Moodboard y referencias visuales."
            path={`/host/${eventId}/planner/inspiration`}
            lines={[{ text: `Ideas: ${stats.inspiration.count}` }]}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default PlannerDashboard;
