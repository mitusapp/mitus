// src/pages/planner/PlannerTasks.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// React Query
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Componentes
import TasksList from '@/components/planner/TasksList.jsx';
import TasksKanban from '@/components/planner/TasksKanban.jsx';
import TaskFormModal from '@/components/planner/TaskFormModal.jsx';
import TasksSummary from '@/components/planner/TasksSummary.jsx';

// Categorías (nuevo)
import { useCategories } from '@/features/categories/useCategories';

/* --------------------------- Helpers de fecha (LOCAL) --------------------------- */
// Acepta 'YYYY-MM-DD' o ISO con 'T' y devuelve Date local
const parseLocalYMD = (s) => {
  if (!s) return null;
  if (typeof s === 'string') {
    const mIso = s.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (mIso) {
      const [y, m, d] = mIso[1].split('-').map(Number);
      return new Date(y, m - 1, d); // local
    }
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
};
// Forzar valor apto para <input type="date">
const ensureYMD = (s) => {
  if (!s) return '';
  return typeof s === 'string' && s.includes('T') ? s.split('T')[0] : s;
};
// Mostrar fecha corta en es-ES sin desfase
const formatShortEsDate = (d) => {
  const date = parseLocalYMD(d);
  return date ? date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};
/* ------------------------------------------------------------------------------- */

/** Catálogo de categorías (LEGADO) – se mantiene para compatibilidad visual en List/Kanban */
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

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Privado' },
  { value: 'team', label: 'Equipo' },
  { value: 'public', label: 'Público' },
];

const labelFromServiceType = (value) =>
  SERVICE_TYPES.find((s) => s.value === value)?.label || null;

// Etiquetas del tipo de evento (como en ProfilePage.jsx)
const EVENT_TYPE_LABELS = {
  boda: 'Boda',
  quince: 'Quince Años',
  cumpleanos: 'Cumpleaños',
  corporativo: 'Corporativo',
  babyshower: 'Baby Shower',
  aniversario: 'Aniversario',
  otro: 'Otro Evento',
};

const PlannerTasks = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Categorías (nuevo)
  const { byId } = useCategories();
  const getCategoryLabel = useCallback(
    (id) => {
      if (!id) return '';
      const c = byId[id];
      if (!c) return '';
      const parent = c.parent_id ? byId[c.parent_id] : null;
      return parent ? `${parent.name} › ${c.name}` : c.name;
    },
    [byId]
  );

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // list | kanban

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: null,
    // LEGADO: se mantiene en el estado para no romper compatibilidad en BD/vistas
    category: '',
    // NUEVO:
    category_id: null,
    assignee_team_id: null,
    visibility: 'private',
  });
  const [teamMembers, setTeamMembers] = useState([]);

  // ---- Encabezado tipo “Boda de Ana y Luis – 25/10/2025”
  const [eventHeader, setEventHeader] = useState('');

  const fetchEventInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, event_type, event_type_label, invitation_details')
        .eq('id', eventId)
        .single();
      if (error) throw error;

      const hostsArr = data?.invitation_details?.hosts;
      const hosts = Array.isArray(hostsArr) && hostsArr.length ? hostsArr.join(' y ') : (data?.title || '');
      const typeLabel = EVENT_TYPE_LABELS[data?.event_type] || data?.event_type_label || 'Evento';
      const dateLabel = formatShortEsDate(data?.date);

      const header = `${typeLabel}${hosts ? ` de ${hosts}` : ''}${dateLabel ? ` – ${dateLabel}` : ''}`;
      setEventHeader(header);
    } catch {
      setEventHeader('');
    }
  }, [eventId]);

  const fetchTeam = useCallback(async () => {
    const { data, error } = await supabase
      .from('planner_team')
      .select('id, name')
      .eq('event_id', eventId)
      .order('name', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setTeamMembers(data || []);
  }, [eventId]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('planner_tasks')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error al cargar tareas', description: error.message, variant: 'destructive' });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchEventInfo(); }, [fetchEventInfo]);
  useEffect(() => { fetchTeam(); }, [fetchTeam]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleOpenModal = (task = null) => {
    setCurrentTask(task);
    setFormData(
      task
        ? {
            title: task.title,
            description: task.description || '',
            due_date: ensureYMD(task.due_date || ''), // Sanitiza ISO -> YMD
            priority: task.priority || null,
            // LEGADO:
            category: task.category || '',
            // NUEVO:
            category_id: task.category_id || null,
            assignee_team_id: task.assignee_team_id || null,
            visibility: task.visibility || 'private',
          }
        : {
            title: '',
            description: '',
            due_date: '',
            priority: null,
            category: '',
            category_id: null,
            assignee_team_id: null,
            visibility: 'private',
          }
    );
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSaving(true);

    // Payload con nuevo campo category_id (y legado category para compatibilidad)
    const basePayload = {
      event_id: eventId,
      title: formData.title,
      description: formData.description || null,
      due_date: ensureYMD(formData.due_date) || null,
      priority: formData.priority || null,
      category: formData.category || null,       // LEGADO (no se toca aún)
      category_id: formData.category_id || null, // NUEVO
      assignee_team_id: formData.assignee_team_id || null,
      visibility: formData.visibility || 'private',
    };

    // Helper para ejecutar insert/update
    const execSave = async (payload) => {
      if (currentTask) {
        return await supabase.from('planner_tasks').update(payload).eq('id', currentTask.id);
      }
      return await supabase.from('planner_tasks').insert(payload);
    };

    let { error } = await execSave(basePayload);

    // Fallback: si la columna category_id aún no existe en BD, reintenta sin ese campo
    if (error && /category_id/i.test(error.message) && /does not exist/i.test(error.message)) {
      const { category_id, ...legacyPayload } = basePayload;
      const retry = await execSave(legacyPayload);
      error = retry.error;
      if (!retry.error) {
        toast({
          title: 'Guardado sin categoría jerárquica',
          description: 'Aún no existe la columna category_id en planner_tasks. Se guardó sin esa categoría.',
        });
      }
    }

    if (error) {
      toast({ title: 'Error al guardar tarea', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Tarea ${currentTask ? 'actualizada' : 'creada'}` });
      setIsModalOpen(false);
      fetchTasks();
    }

    setSaving(false);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta tarea?')) return;
    const { error } = await supabase.from('planner_tasks').delete().eq('id', taskId);
    if (error) {
      toast({ title: 'Error al eliminar tarea', variant: 'destructive' });
    } else {
      toast({ title: 'Tarea eliminada' });
      fetchTasks();
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['events', user.id] });
      }
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    const { error } = await supabase.from('planner_tasks').update({ status }).eq('id', taskId);
    if (error) {
      toast({ title: 'Error al actualizar estado', variant: 'destructive' });
    } else {
      fetchTasks();
      if (status === 'completed' && user?.id) {
        queryClient.invalidateQueries({ queryKey: ['events', user.id] });
      }
    }
  };

  // --- Buscador --------------------------------------------------------------
  const [query, setQuery] = useState('');

  const norm = (s) =>
    String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const teamMap = useMemo(() => {
    const map = {};
    (teamMembers || []).forEach((m) => { map[m.id] = m.name; });
    return map;
  }, [teamMembers]);

  const filteredTasks = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return tasks;

    const statusLabel = { pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completada' };
    const visLabel = { private: 'Privado', team: 'Equipo', public: 'Público' };

    return tasks.filter((t) => {
      const catLabelLegacy = labelFromServiceType(t.category) || '';
      const catLabelNew = getCategoryLabel(t.category_id) || '';
      const assignee = t.assignee_team_id ? (teamMap[t.assignee_team_id] || '') : '';
      const hay = norm(
        `${t.title} ${t.description || ''} ${t.category || ''} ${catLabelLegacy} ${catLabelNew} ${t.priority || ''} ${assignee} ${t.visibility || ''} ${visLabel[t.visibility] || ''} ${t.status || ''} ${statusLabel[t.status] || ''} ${t.due_date || ''}`
      );
      return hay.includes(q);
    });
  }, [tasks, query, teamMap, getCategoryLabel]);

  // Para mantener la UI actual sin tocar TasksList/TasksKanban:
  // sobrescribimos SOLO para vista el campo 'category' con el label de category_id (si existe).
  const viewTasks = useMemo(() => {
    return (filteredTasks || []).map((t) => {
      const newLabel = getCategoryLabel(t.category_id);
      return newLabel ? { ...t, category: newLabel } : t;
    });
  }, [filteredTasks, getCategoryLabel]);

  // --- Items para el resumen (solo tareas) -----------------------------------
  const summaryItems = useMemo(() => {
    return (tasks || []).map((t) => ({
      due: t.due_date || null,
      prioridad: t.priority || 'low',
      status: t.status || 'pending',
      owner: t.assignee_team_id ? (teamMap[t.assignee_team_id] || 'Sin responsable') : 'Sin responsable',
    }));
  }, [tasks, teamMap]);

  // --------------------------------------------------------------------------

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => navigate(`/host/${eventId}/planner`)}
                className="text-white hover:bg-white/10 mr-4"
              >
                <ArrowLeft />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Tareas y Checklist</h1>
                {eventHeader && (
                  <p className="text-xs sm:text-sm text-gray-300 mt-0.5 break-words">
                    {eventHeader}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex bg-white/10 rounded-lg p-1">
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  onClick={() => setView('list')}
                  className="text-sm"
                >
                  Lista
                </Button>
                <Button
                  variant={view === 'kanban' ? 'secondary' : 'ghost'}
                  onClick={() => setView('kanban')}
                  className="text-sm"
                >
                  Kanban
                </Button>
              </div>
              <Button onClick={() => handleOpenModal()} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Tarea
              </Button>
            </div>
          </div>

          {/* 🔎 Resumen SOLO tareas (inspirado en TasksPaymentsSummary) */}
          <TasksSummary items={summaryItems} initialRange="week" />

          {/* 🔎 Buscador */}
          <div className="relative mb-6 mt-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400 text-white"
              placeholder="Buscar por título, categoría (label), responsable, descripción…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="text-center text-white">Cargando tareas...</div>
          ) : view === 'list' ? (
            <TasksList
              tasks={viewTasks}
              onToggleStatus={updateTaskStatus}
              onEdit={handleOpenModal}
              onDelete={handleDeleteTask}
              labelFromServiceType={labelFromServiceType} // se mantiene para items LEGADO
              teamMembers={teamMembers}
            />
          ) : (
            <TasksKanban
              tasks={viewTasks}
              onUpdateStatus={updateTaskStatus}
              onEdit={handleOpenModal}
              onDelete={handleDeleteTask}
              labelFromServiceType={labelFromServiceType} // se mantiene para items LEGADO
              teamMembers={teamMembers}
            />
          )}
        </motion.div>
      </div>

      {/* Modal reutilizable */}
      <TaskFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={currentTask ? 'Editar Tarea' : 'Crear Tarea'}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSaveTask}
        saving={saving}
        teamMembers={teamMembers}
        priorityOptions={PRIORITY_OPTIONS}
        visibilityOptions={VISIBILITY_OPTIONS}
      />
    </div>
  );
};

export default PlannerTasks;
