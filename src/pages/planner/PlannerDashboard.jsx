import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardCheck, Clock, Truck, DollarSign, ListChecks, CalendarClock, Banknote, FileText, Map, Utensils, Gift, Users, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';

const PlannerDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    upcomingTasks: [],
    nextTimelineItem: null,
    budget: { estimated: 0, actual: 0 },
  });

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data: tasks, error: tasksError } = await supabase
        .from('planner_tasks')
        .select('id, title, due_date')
        .eq('event_id', eventId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(3);
      if (tasksError) throw tasksError;

      const { data: timeline, error: timelineError } = await supabase
        .from('planner_timeline_items')
        .select('id, title, start_time')
        .eq('event_id', eventId)
        .gt('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(1);
      if (timelineError) throw timelineError;

      const { data: budgetItems, error: budgetError } = await supabase
        .from('planner_budget_items')
        .select('estimated_cost, actual_cost')
        .eq('event_id', eventId);
      if (budgetError) throw budgetError;

      const budget = budgetItems.reduce(
        (acc, item) => ({
          estimated: acc.estimated + Number(item.estimated_cost || 0),
          actual: acc.actual + Number(item.actual_cost || 0),
        }),
        { estimated: 0, actual: 0 }
      );

      setSummary({
        upcomingTasks: tasks,
        nextTimelineItem: timeline && timeline.length > 0 ? timeline[0] : null,
        budget,
      });
    } catch (error) {
      if (error.code !== 'PGRST116') { // Ignore "0 rows" error for timeline explicitly
        toast({ title: "Error al cargar el resumen", description: error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const modules = [
    { name: 'Tareas y Checklist', path: 'tasks', icon: <ClipboardCheck />, color: 'cyan' },
    { name: 'Cronograma', path: 'timeline', icon: <Clock />, color: 'purple' },
    { name: 'Proveedores', path: 'providers', icon: <Truck />, color: 'blue' },
    { name: 'Presupuesto', path: 'budget', icon: <DollarSign />, color: 'green' },
    { name: 'Documentos', path: 'documents', icon: <FileText />, color: 'orange' },
    { name: 'Opciones de Lugar', path: 'venues', icon: <Map />, color: 'red' },
    { name: 'Comida y Bebidas', path: 'catering', icon: <Utensils />, color: 'yellow' },
    { name: 'Regalos', path: 'gifts', icon: <Gift />, color: 'pink' },
    { name: 'Equipo y Roles', path: 'team', icon: <Users />, color: 'indigo' },
    { name: 'Inspiración', path: 'inspiration', icon: <Image />, color: 'teal' },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4">
              <ArrowLeft />
            </Button>
            <h1 className="text-3xl font-bold text-white">Panel del Planner</h1>
          </div>

          {loading ? <div className="text-center text-white">Cargando...</div> :
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
                {modules.map((mod, i) => (
                  <motion.div
                    key={mod.path}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 cursor-pointer hover:border-${mod.color}-500/50 hover:bg-${mod.color}-500/10 transition-all`}
                    onClick={() => navigate(`/host/${eventId}/planner/${mod.path}`)}
                  >
                    <div className={`text-${mod.color}-300 mb-3`}>{React.cloneElement(mod.icon, { className: "w-8 h-8" })}</div>
                    <h2 className="text-xl font-bold text-white">{mod.name}</h2>
                    <p className="text-gray-400">Gestiona {mod.name.toLowerCase()} de tu evento.</p>
                  </motion.div>
                ))}
              </div>
              <div className="space-y-6">
                <SummaryCard icon={<ListChecks className="text-cyan-300" />} title="Próximas Tareas">
                  {summary.upcomingTasks.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {summary.upcomingTasks.map(task => (
                        <li key={task.id} className="flex justify-between items-center">
                          <span className="text-gray-200">{task.title}</span>
                          <span className="text-gray-400 text-xs">{new Date(task.due_date).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-gray-400">No hay tareas pendientes.</p>}
                </SummaryCard>
                <SummaryCard icon={<CalendarClock className="text-purple-300" />} title="Siguiente en el Cronograma">
                  {summary.nextTimelineItem ? (
                    <div className="text-sm">
                      <p className="text-gray-200 font-semibold">{summary.nextTimelineItem.title}</p>
                      <p className="text-gray-400 text-xs">{new Date(summary.nextTimelineItem.start_time).toLocaleString()}</p>
                    </div>
                  ) : <p className="text-sm text-gray-400">No hay próximos hitos.</p>}
                </SummaryCard>
                <SummaryCard icon={<Banknote className="text-green-300" />} title="Resumen de Presupuesto">
                  <div className="text-sm space-y-1">
                    <p className="flex justify-between"><span>Estimado:</span> <span className="font-semibold text-gray-200">${summary.budget.estimated.toLocaleString()}</span></p>
                    <p className="flex justify-between"><span>Real:</span> <span className="font-semibold text-gray-200">${summary.budget.actual.toLocaleString()}</span></p>
                  </div>
                </SummaryCard>
              </div>
            </div>
          }
        </motion.div>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, title, children }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">{icon}{title}</h3>
    {children}
  </div>
);

export default PlannerDashboard;