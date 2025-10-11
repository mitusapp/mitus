// src/components/planner/TasksList.jsx
import React from 'react';
import { CheckCircle, Circle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TasksList({
  tasks = [],
  onToggleStatus,        // (taskId, nextStatus) => void
  onEdit,                // (task) => void
  onDelete,              // (taskId) => void
  labelFromServiceType,  // (value) => string
  teamMembers = [],      // opcional: [{id, name}] para mostrar "Responsable"
}) {
  // ---- Helpers de fecha (local, sin desfases) -------------------------------
  const parseLocalDate = (d) => {
    if (!d) return null;

    if (typeof d === 'string') {
      // 'YYYY-MM-DD' -> construir en local
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day);
      }
      // ISO con 'T' -> tomar solo la parte de fecha
      const mIso = d.match(/^(\d{4}-\d{2}-\d{2})T/);
      if (mIso) {
        const [y, m, day] = mIso[1].split('-').map(Number);
        return new Date(y, m - 1, day);
      }
    }

    const dd = new Date(d);
    return Number.isNaN(dd.getTime()) ? null : dd;
  };

  const fmtDate = (d) => {
    const dd = parseLocalDate(d);
    return dd ? dd.toLocaleDateString() : 'Sin fecha';
  };

  // ---- Mapas y utilidades ---------------------------------------------------
  const teamMap = React.useMemo(() => {
    const map = {};
    (teamMembers || []).forEach((m) => { map[m.id] = m.name; });
    return map;
  }, [teamMembers]);

  const statusLabel = (s) =>
    ({ pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completada' }[s] || 'Pendiente');

  const statusChipCls = (s) =>
    ({
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-600/30',
      in_progress: 'bg-blue-500/20 text-blue-300 border-blue-600/30',
      completed: 'bg-green-500/20 text-green-300 border-green-600/30',
    }[s] || 'bg-white/10 text-gray-200 border-white/20');

  const priorityChip = (p) => {
    if (!p) return null;
    const map = {
      low: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/30',
      medium: 'bg-amber-500/20 text-amber-300 border-amber-600/30',
      high: 'bg-rose-500/20 text-rose-300 border-rose-600/30',
    };
    const label = { low: 'Baja', medium: 'Media', high: 'Alta' }[p] || p;
    return <span className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${map[p] || 'bg-white/10 text-gray-200 border-white/20'}`}>{label}</span>;
  };

  const visibilityLabel = (v) => ({ private: 'Privado', team: 'Equipo', public: 'Público' }[v] || 'Privado');

  const nextStatus = (s) => (s === 'completed' ? 'pending' : 'completed');

  // ---- ORDEN: fecha (ASC) y, empate, prioridad (Alta->Media->Baja) ---------
  const prioRank = (p) => ({ high: 0, medium: 1, low: 2 }[p] ?? 3);

  const sortedTasks = React.useMemo(() => {
    const toTime = (t) => {
      const d = parseLocalDate(t?.due_date);
      return d ? d.getTime() : Number.POSITIVE_INFINITY; // sin fecha al final
    };
    return [...(tasks || [])].sort((a, b) => {
      const ta = toTime(a);
      const tb = toTime(b);
      if (ta !== tb) return ta - tb;                 // fecha cercana primero
      const pa = prioRank(a?.priority);
      const pb = prioRank(b?.priority);
      if (pa !== pb) return pa - pb;                 // Alta antes que Media y Baja
      return (a?.title || '').localeCompare(b?.title || ''); // estable
    });
  }, [tasks]);
  // ---------------------------------------------------------------------------

  return (
    <div className="rounded border border-white/10 overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="text-left p-3 font-medium">Tarea / Descripción</th>
            <th className="text-left p-3 font-medium">Categoría</th>
            <th className="text-left p-3 font-medium">Prioridad</th>
            <th className="text-left p-3 font-medium">Responsable</th>
            <th className="text-left p-3 font-medium">Fecha límite</th>
            <th className="text-left p-3 font-medium">Visibilidad</th>
            <th className="text-left p-3 font-medium">Estado</th>
            <th className="text-right p-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedTasks.map((task) => {
            const completed = task.status === 'completed';
            const catLabel = labelFromServiceType?.(task.category) || task.category || '—';
            const assignee = task.assignee_team_id ? (teamMap[task.assignee_team_id] || '—') : '—';
            return (
              <tr key={task.id} className="border-b border-white/10 hover:bg-white/5">
                <td className="p-3 align-top">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => onToggleStatus?.(task.id, nextStatus(task.status))}
                      title={completed ? 'Marcar pendiente' : 'Marcar completada'}
                      className="mt-[2px]"
                    >
                      {completed ? <CheckCircle className="text-green-400" /> : <Circle className="text-gray-400" />}
                    </button>
                    <div>
                      <div className={`font-medium text-white ${completed ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                        {priorityChip(task.priority)}
                      </div>
                      {task.description && (
                        <div className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-3 text-gray-200">{catLabel}</td>
                <td className="p-3 text-gray-200">
                  {task.priority ? priorityChip(task.priority) : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="p-3 text-gray-200">{assignee}</td>
                <td className="p-3 text-gray-200">{fmtDate(task.due_date)}</td>
                <td className="p-3 text-gray-200">{visibilityLabel(task.visibility)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs border ${statusChipCls(task.status)}`}>
                    {statusLabel(task.status)}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(task)}
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 text-gray-300" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete?.(task.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {(!sortedTasks || sortedTasks.length === 0) && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-gray-400">No hay tareas creadas.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
