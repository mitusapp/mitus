import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowUpDown } from 'lucide-react';

export default function TimelineList({
  items = [],
  onEdit,
  onDelete,
  labelFromServiceType,
  labelFromSubject,
  teamMembers = [],
  providersMap = new Map(),
  loading = false,
  emptyMessage = 'No hay hitos en el cronograma.',
  eventHeader = '', // para encabezado del PDF
}) {
  // Mapa rápido de id → nombre del equipo
  const teamMap = useMemo(() => {
    const m = new Map();
    (teamMembers || []).forEach((t) => m.set(t.id, t.display_name || t.name || '—'));
    return m;
  }, [teamMembers]);

  const formatTime12 = (t) => {
    if (!t) return '';
    const m = String(t).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return '';
    let h = parseInt(m[1], 10);
    const min = m[2];
    const am = h < 12;
    if (h === 0) h = 12; // 00 -> 12 AM
    if (h > 12) h = h - 12;
    const hh = String(h).padStart(2, '0');
    return `${hh}:${min} ${am ? 'A.M.' : 'P.M.'}`;
  };

  // -------------------- Filtros --------------------
  const [fCat, setFCat] = useState('');
  const [fSubj, setFSubj] = useState('');
  const [fAssignee, setFAssignee] = useState('');
  const [fLoc, setFLoc] = useState('');

  const options = useMemo(() => {
    const cats = new Map();
    const subjs = new Map();
    const ass = new Map();
    const locs = new Set();
    (items || []).forEach((it) => {
      if (it.category) cats.set(it.category, labelFromServiceType ? (labelFromServiceType(it.category) || it.category) : it.category);
      if (it.subject) subjs.set(it.subject, labelFromSubject ? (labelFromSubject(it.subject) || it.subject) : it.subject);
      if (it.assignee_team_id) ass.set(it.assignee_team_id, teamMap.get(it.assignee_team_id) || it.assignee_team_id);
      if (it.location) locs.add(it.location);
    });
    return {
      cats: Array.from(cats, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es')),
      subjs: Array.from(subjs, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es')),
      ass: Array.from(ass, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es')),
      locs: Array.from(locs).sort((a, b) => a.localeCompare(b, 'es')),
    };
  }, [items, labelFromServiceType, labelFromSubject, teamMap]);

  // -------------------- Orden secundario --------------------
  const [sortField, setSortField] = useState(null); // 'category' | 'subject' | 'assignee' | 'location'
  const [sortDir, setSortDir] = useState('asc');

  const toggleSort = (field) => {
    setSortField((prev) => (prev === field ? field : field));
    setSortDir((prev) => (sortField === field ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'));
  };

  const chronoKey = (it) => {
    const d = it.start_date ? String(it.start_date) : '9999-12-31';
    const t = it.start_time ? String(it.start_time).slice(0, 5) : '99:99';
    return `${d}T${t}`; // garantiza orden cronológico primario
  };

  const getFieldValue = (it, field) => {
    switch (field) {
      case 'category':
        return (labelFromServiceType ? (labelFromServiceType(it.category) || it.category) : it.category) || '';
      case 'subject':
        return (labelFromSubject ? (labelFromSubject(it.subject) || it.subject) : it.subject) || '';
      case 'assignee':
        return (it.assignee_team_id ? (teamMap.get(it.assignee_team_id) || '') : '') || '';
      case 'location':
        return it.location || '';
      default:
        return '';
    }
  };

  // Aplica filtros y luego orden con prioridad cronológica
  const view = useMemo(() => {
    const filtered = (items || []).filter((it) => {
      if (fCat && it.category !== fCat) return false;
      if (fSubj && it.subject !== fSubj) return false;
      if (fAssignee && String(it.assignee_team_id) !== String(fAssignee)) return false;
      if (fLoc && it.location !== fLoc) return false;
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      const ka = chronoKey(a);
      const kb = chronoKey(b);
      if (ka < kb) return -1;
      if (ka > kb) return 1;
      // iguales en tiempo → aplica orden secundario si existe
      if (!sortField) return 0;
      const va = getFieldValue(a, sortField);
      const vb = getFieldValue(b, sortField);
      const cmp = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [items, fCat, fSubj, fAssignee, fLoc, sortField, sortDir]);

  // -------------------- Exportar PDF --------------------
  const exportPDF = () => {
    const rows = view; // ya viene filtrado y cronológicamente ordenado
    const win = window.open('', '_blank');
    if (!win) return;

    const styles = `
      <style>
        *{ box-sizing:border-box; }
        body{ font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:24px; color:#111; }
        h1{ font-size:20px; margin:0 0 4px; }
        .sub{ color:#444; font-size:12px; margin:0 0 16px; }
        table{ width:100%; border-collapse:collapse; }
        th, td{ border:1px solid #ddd; padding:8px; font-size:12px; vertical-align:top; }
        th{ background:#f3f4f6; text-align:left; }
        .muted{ color:#666; font-size:11px; }
      </style>
    `;

    const toTime = (t)=> formatTime12(t) || '—';

    const headerHtml = `
      <h1>Cronograma / Run of Show</h1>
      <div class="sub">${eventHeader || ''}</div>
    `;

    const rowsHtml = rows.map((it) => {
      const providers = (it.provider_ids || [])
        .map((id) => providersMap.get(id)?.name)
        .filter(Boolean)
        .join(', ');
      const title = it.title || 'Sin título';
      const desc = it.description ? `<div class=\"muted\">${it.description}</div>` : '';
      const obs = it.observations ? `<div class=\"muted\"><em>Observaciones:</em> ${it.observations}</div>` : '';
      return `
        <tr>
          <td>${toTime(it.start_time)}</td>
          <td>${toTime(it.end_time)}</td>
          <td><div><strong>${title}</strong></div>${desc}${obs}</td>
          <td>${providers || '—'}</td>
          <td>${getFieldValue(it,'location') || '—'}</td>
          <td>${getFieldValue(it,'subject') || '—'}</td>
          <td>${getFieldValue(it,'assignee') || '—'}</td>
          <td>${getFieldValue(it,'category') || '—'}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset=\"utf-8\" />
          <title>Cronograma</title>
          ${styles}
        </head>
        <body>
          ${headerHtml}
          <table>
            <thead>
              <tr>
                <th>Hora inicio</th>
                <th>Hora fin</th>
                <th>Actividad / Descripción / Observaciones</th>
                <th>Proveedor</th>
                <th>Ubicación</th>
                <th>Sujeto</th>
                <th>Responsable</th>
                <th>Categoría</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  // -------------------- Render --------------------
  return (
    <div className="rounded border border-white/10 overflow-hidden">
      {/* Filtros y Exportar */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-5 gap-2 bg-white/5 border-b border-white/10">
        <select className="px-2 py-2 rounded bg-white text-gray-900" value={fCat} onChange={(e)=>setFCat(e.target.value)}>
          <option value="">Categoría (todas)</option>
          {options.cats.map((o)=> (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select className="px-2 py-2 rounded bg-white text-gray-900" value={fSubj} onChange={(e)=>setFSubj(e.target.value)}>
          <option value="">Sujeto (todos)</option>
          {options.subjs.map((o)=> (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select className="px-2 py-2 rounded bg-white text-gray-900" value={fAssignee} onChange={(e)=>setFAssignee(e.target.value)}>
          <option value="">Responsable (todos)</option>
          {options.ass.map((o)=> (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select className="px-2 py-2 rounded bg-white text-gray-900" value={fLoc} onChange={(e)=>setFLoc(e.target.value)}>
          <option value="">Ubicación (todas)</option>
          {options.locs.map((loc)=> (<option key={loc} value={loc}>{loc}</option>))}
        </select>
        <div className="flex items-center justify-end">
          <Button onClick={exportPDF} className="bg-emerald-600 hover:bg-emerald-500">Exportar PDF</Button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="text-left p-3 font-medium">Hora inicio</th>
            <th className="text-left p-3 font-medium">Hora fin</th>
            <th className="text-left p-3 font-medium w-[40%]">Actividad / Descripción / Observaciones</th>
            <th className="text-left p-3 font-medium">Proveedor</th>
            <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={()=>toggleSort('location')}>
              <span className="inline-flex items-center gap-1">Ubicación <ArrowUpDown className="w-3.5 h-3.5" /></span>
            </th>
            <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={()=>toggleSort('subject')}>
              <span className="inline-flex items-center gap-1">Sujeto <ArrowUpDown className="w-3.5 h-3.5" /></span>
            </th>
            <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={()=>toggleSort('assignee')}>
              <span className="inline-flex items-center gap-1">Responsable <ArrowUpDown className="w-3.5 h-3.5" /></span>
            </th>
            <th className="text-left p-3 font-medium cursor-pointer select-none" onClick={()=>toggleSort('category')}>
              <span className="inline-flex items-center gap-1">Categoría <ArrowUpDown className="w-3.5 h-3.5" /></span>
            </th>
            <th className="text-right p-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-gray-400">Cargando…</td>
            </tr>
          )}

          {!loading && view.map((item) => {
            const providers = (item.provider_ids || [])
              .map((id) => providersMap.get(id)?.name)
              .filter(Boolean);

            const startTime = formatTime12(item.start_time);
            const endTime = formatTime12(item.end_time);

            const catLabel = labelFromServiceType ? (labelFromServiceType(item.category) || '') : (item.category || '');
            const subjLabel = labelFromSubject ? (labelFromSubject(item.subject) || '') : (item.subject || '');
            const assignee = item.assignee_team_id ? (teamMap.get(item.assignee_team_id) || '') : '';

            return (
              <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 align-top">
                {/* Hora inicio */}
                <td className="p-3 whitespace-nowrap">
                  <div className="text-gray-100 font-medium">{startTime || '—'}</div>
                </td>

                {/* Hora fin */}
                <td className="p-3 whitespace-nowrap">
                  <div className="text-gray-100 font-medium">{endTime || '—'}</div>
                </td>

                {/* Actividad / Descripción / Observaciones */}
                <td className="p-3 w-[40%]">
                  <div className="font-medium text-white line-clamp-1" title={item.title || 'Sin título'}>
                    {item.title || 'Sin título'}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-400 line-clamp-3 mt-0.5" title={item.description}>
                      {item.description}
                    </div>
                  )}
                  {item.observations && (
                    <div className="text-xs text-gray-400 line-clamp-3 mt-0.5" title={item.observations}>
                      <span className="italic">Observaciones: </span>{item.observations}
                    </div>
                  )}
                </td>

                {/* Proveedor(es) */}
                <td className="p-3">
                  {providers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {providers.map((name, i) => (
                        <span key={`${item.id}-prov-${i}`} className="text-[11px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white">
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>

                {/* Ubicación */}
                <td className="p-3 text-gray-200">{item.location || '—'}</td>

                {/* Sujeto */}
                <td className="p-3 text-gray-200">{subjLabel || '—'}</td>

                {/* Responsable */}
                <td className="p-3 text-gray-200">{assignee || '—'}</td>

                {/* Categoría */}
                <td className="p-3 text-gray-200">{catLabel || '—'}</td>

                {/* Acciones */}
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onEdit?.(item)} title="Editar">
                      <Edit className="w-4 h-4 text-gray-300" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete?.(item.id)} title="Eliminar">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}

          {!loading && view.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-gray-400">{emptyMessage}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
