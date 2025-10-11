// src/components/planner/TasksKanban.jsx
import React, { useMemo } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TasksKanban({
  tasks = [],
  onUpdateStatus,        // (taskId, nextStatus) => void
  onEdit,                // (task) => void
  onDelete,              // (taskId) => void
  labelFromServiceType,  // (value) => string
  teamMembers = [],      // [{id,name}]
}) {

  const teamMap = useMemo(() => {
    const m = {};
    (teamMembers || []).forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teamMembers]);

  // --- Utilidades de fecha y orden ---
  const parseLocalDate = (d) => {
    if (!d) return null;

    if (typeof d === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day); // local
      }
      const mIso = d.match(/^(\d{4}-\d{2}-\d{2})T/);
      if (mIso) {
        const [y, m, day] = mIso[1].split('-').map(Number);
        return new Date(y, m - 1, day); // día local sin desfase
      }
    }

    const dd = new Date(d);
    return Number.isNaN(dd.getTime()) ? null : dd;
  };

  const fmtDate = (d) => {
    const dd = parseLocalDate(d);
    return dd ? dd.toLocaleDateString() : 'Sin fecha';
  };

  const prioRank = (p) => ({ high: 0, medium: 1, low: 2 }[p] ?? 3);
  const compareTasks = (a, b) => {
    const ta = parseLocalDate(a?.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const tb = parseLocalDate(b?.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    const pa = prioRank(a?.priority);
    const pb = prioRank(b?.priority);
    if (pa !== pb) return pa - pb;
    return (a?.title || '').localeCompare(b?.title || '');
  };
  // -----------------------------------

  const columns = useMemo(() => {
    const by = (status) =>
      (tasks || [])
        .filter((t) => t.status === status)
        .slice()
        .sort(compareTasks);

    return {
      pending: by('pending'),
      in_progress: by('in_progress'),
      completed: by('completed'),
    };
  }, [tasks]);

  const statusLabel = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completada',
  };

  const priorityPill = (p) => {
    if (!p) return null;
    const cls = {
      low: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/30',
      medium: 'bg-amber-500/20 text-amber-300 border-amber-600/30',
      high: 'bg-rose-500/20 text-rose-300 border-rose-600/30',
    }[p] || 'bg-white/10 text-gray-200 border-white/20';
    const label = { low: 'Baja', medium: 'Media', high: 'Alta' }[p] || p;
    return <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(columns).map(([status, tasksInCol]) => (
        <div key={status} className="bg-white/10 rounded-2xl p-4 border border-white/20">
          <h3 className="font-bold text-white mb-4">
            {statusLabel[status]} <span className="text-gray-400">({tasksInCol.length})</span>
          </h3>
          <div className="space-y-3">
            {tasksInCol.map((task) => {
              const assignee = task.assignee_team_id ? (teamMap[task.assignee_team_id] || '—') : '—';
              const catLabel = labelFromServiceType?.(task.category) || task.category || '—';
              return (
                <div key={task.id} className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <p className="font-semibold text-white">
                    {task.title}
                    {priorityPill(task.priority)}
                  </p>
                  {task.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-3">{task.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-300 space-y-1">
                    <div><span className="text-gray-400">Categoría: </span>{catLabel}</div>
                    <div><span className="text-gray-400">Responsable: </span>{assignee}</div>
                    <div><span className="text-gray-400">Fecha límite: </span>{fmtDate(task.due_date)}</div>
                    <div><span className="text-gray-400">Visibilidad: </span>
                      {{ private: 'Privado', team: 'Equipo', public: 'Público' }[task.visibility] || 'Privado'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {/* Cambiar estado */}
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateStatus?.(task.id, e.target.value)}
                      className="text-xs p-1 rounded bg-white text-gray-900 border border-white/20"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="completed">Completada</option>
                    </select>

                    <div className="ml-auto flex gap-1">
                      <Button
                        onClick={() => onEdit?.(task)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-blue-400"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => onDelete?.(task.id)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {tasksInCol.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm bg-white/5 rounded-lg">
                No hay tareas en esta columna.
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
