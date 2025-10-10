import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Clock, MapPin, Users, Layers, UserSquare2 } from 'lucide-react';

export default function TimelineList({
  items = [],
  onEdit,
  onDelete,
  labelFromServiceType,
  labelFromSubject,      // NUEVO
  teamMembers = [],
  providersMap = new Map(),
  loading = false,
  emptyMessage = 'No hay hitos en el cronograma.',
}) {
  const teamMap = useMemo(() => {
    const m = new Map();
    for (const t of teamMembers) m.set(t.id, t.display_name || t.name || 'Miembro');
    return m;
  }, [teamMembers]);

  const fmtTime = (v) =>
    v ? new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
  const calcDuration = (a, b) => {
    if (!a || !b) return null;
    const ms = new Date(b) - new Date(a);
    if (Number.isNaN(ms) || ms <= 0) return null;
    return Math.round(ms / 60000);
  };

  return (
    <div className="space-y-4">
      {loading && <div className="text-center text-gray-400 py-8">Cargando…</div>}

      {!loading && items.map((item, idx) => {
        const dur = calcDuration(item.start_time, item.end_time);
        const assignee = item.assignee_team_id ? teamMap.get(item.assignee_team_id) : null;
        const providerNames = (item.provider_ids || []).map((id) => providersMap.get(id)?.name).filter(Boolean);
        const catLabel = labelFromServiceType?.(item.category) || item.category || '';
        const subjLabel = labelFromSubject?.(item.subject) || '';

        return (
          <div key={item.id} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="bg-purple-500/30 rounded-full p-2 border border-purple-400/30">
                <Clock className="text-purple-300 w-5 h-5" />
              </div>
              {idx < items.length - 1 && <div className="w-px h-full bg-white/20 my-2"></div>}
            </div>

            <div className="flex-1 bg-white/10 border border-white/20 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-white">
                    {fmtTime(item.start_time)}
                    {item.end_time && <>–{fmtTime(item.end_time)}</>}
                    {dur ? <span className="text-xs text-gray-300 ml-2">({dur} min)</span> : null}
                    {' '}• {item.title}
                  </div>

                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-300">
                    {catLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3 h-3" /> {catLabel}
                      </span>
                    )}
                    {subjLabel && (
                      <span className="inline-flex items-center gap-1">
                        <UserSquare2 className="w-3 h-3" /> {subjLabel}
                      </span>
                    )}
                    {assignee && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3 h-3" /> {assignee}
                      </span>
                    )}
                    {item.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {item.location}
                      </span>
                    )}
                  </div>

                  {providerNames.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {providerNames.map((n, i) => (
                        <span key={`${item.id}-prov-${i}`} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs text-white">
                          {n}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.description && (
                    <p className="text-sm text-gray-300 mt-2">{item.description}</p>
                  )}
                  {item.av_cues && (
                    <p className="text-xs text-gray-400 mt-1">Cues: {item.av_cues}</p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-blue-400 hover:bg-blue-500/20"
                    onClick={() => onEdit?.(item)}
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                    onClick={() => onDelete?.(item.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {!loading && items.length === 0 && (
        <p className="text-center text-gray-400 py-16">{emptyMessage}</p>
      )}
    </div>
  );
}
