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
  // -------------------- Estado de filtros y orden --------------------
  const [fCat, setFCat] = useState('');
  const [fSubj, setFSubj] = useState('');
  const [fAssignee, setFAssignee] = useState('');
  const [fLoc, setFLoc] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

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

  const chronoKey = (it) => `${it.start_date || ''} ${it.start_time || ''}`;

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

  const options = useMemo(() => {
    const cats = new Map();
    const subjs = new Map();
    const locs = new Map();
    const assignees = new Map();

    (items || []).forEach((it) => {
      if (it.category) cats.set(it.category, labelFromServiceType ? (labelFromServiceType(it.category) || it.category) : it.category);
      if (it.subject) subjs.set(it.subject, labelFromSubject ? (labelFromSubject(it.subject) || it.subject) : it.subject);
      if (it.location) locs.set(it.location, it.location);
      if (it.assignee_team_id) assignees.set(String(it.assignee_team_id), teamMap.get(it.assignee_team_id) || '');
    });

    return {
      cats: Array.from(cats, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      subjs: Array.from(subjs, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      locs: Array.from(locs, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      assignees: Array.from(assignees, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
    };
  }, [items, labelFromServiceType, labelFromSubject, teamMap]);

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

    // ---- Título de documento dinámico (tipo + hosts + fecha) ----
    const headerForTitle = (eventHeader || '').trim() || 'Evento';
    let dateForTitle = '';
    const earliest = (rows || []).map(it => it.start_date).filter(Boolean).sort()[0];
    if (earliest && earliest.length === 10 && earliest[4] === '-') {
      const [y,m,d] = earliest.split('-');
      dateForTitle = `${d}-${m}-${y}`;
    }
    const rawTitle = `Cronograma ${headerForTitle}${dateForTitle ? ' ' + dateForTitle : ''}`;
    const docTitle = rawTitle
      .replaceAll('/', ' ')
      .replaceAll(':', ' ')
      .replaceAll('*', ' ')
      .replaceAll('?', ' ')
      .replaceAll('"', ' ')
      .replaceAll('<', ' ')
      .replaceAll('>', ' ')
      .replaceAll('|', ' ')
      .trim();

    // Tipografía y estilos de impresión profesionales
    const styles = `
      <style>
        :root{
          --ink:#0f172a;       /* slate-900 */
          --muted:#64748b;     /* slate-500 */
          --border:#e5e7eb;    /* gray-200 */
          --bg:#ffffff;        /* white */
          --head:#f8fafc;      /* slate-50 */
          --accent:#111827;    /* gray-900 */
        }
        *{ box-sizing:border-box; }
        html,body{ margin:0; padding:0; background:var(--bg); color:var(--ink); }
        body{ font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; font-size:12px; line-height:1.45; }
        .wrap{ padding:20px 24px 56px 24px; }
        .header{
          padding:16px 0 10px 0;
          border-bottom:1px solid var(--border);
          margin-bottom:12px;
        }
        .title{
          font-size:18px; font-weight:800; letter-spacing:.2px; text-transform:uppercase;
        }
        .sub{ color:var(--muted); font-size:12px; margin-top:4px; }
        .meta{ color:var(--muted); font-size:11px; margin-top:4px; }

        table{ width:100%; border-collapse:collapse; page-break-inside:auto; }
        thead{ display:table-header-group; }
        tfoot{ display:table-footer-group; }
        th, td{ padding:8px 10px; border-bottom:1px solid var(--border); vertical-align:top; }
        th{ background:var(--head); text-align:left; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.3px; }
        td{ font-size:12px; }

        .col-time{ width:80px; white-space:nowrap; }
        .col-what{ width:auto; }
        .col-prov{ width:160px; }
        .col-loc{ width:140px; }
        .col-subj, .col-assignee, .col-cat{ width:120px; }

        tr{ page-break-inside:avoid; break-inside:avoid; }
        .activity{ font-weight:700; }
        .muted{ color:var(--muted); }
        .note{ font-style:italic; }
        .badge{ display:inline-block; font-size:10px; padding:2px 6px; border:1px solid var(--border); border-radius:9999px; }

        .footer{
          position:fixed; left:0; right:0; bottom:0;
          border-top:1px solid var(--border);
          padding:8px 24px;
          font-size:11px; color:var(--muted);
          background:var(--bg);
        }
        .page { counter-increment: page; }
        .page-num::after { content: counter(page); }
        .total-pages::after { content: counter(pages); }

        @media print{ @page{ margin:16mm 12mm 16mm 12mm; } .wrap{ padding:0; } th, td{ padding:6px 8px; } .footer{ display:none; } }
          .wrap{ padding:0 0 48px 0; }
        }
      </style>
    `;

    const now = new Date();
    const genAt = now.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

    const headerHtml = `
      <div class="header">
        <div class="title">Cronograma / Run of Show</div>
        <div class="sub">${eventHeader || ''}</div>
        <div class="meta">Generado: ${genAt}</div>
      </div>
    `;

    const toTime = (t) => formatTime12(t) || '—';

    const rowsHtml = rows.map((it) => {
      const providers = (it.provider_ids || [])
        .map((id) => providersMap.get(id)?.name)
        .filter(Boolean)
        .join(', ');
      const title = it.title || 'Sin título';
      const desc = it.description ? `<div class="muted">${it.description}</div>` : '';
      const obs = it.observations ? `<div class="muted note">Observaciones: ${it.observations}</div>` : '';
      const subj = `${getFieldValue(it,'subject') || '—'}`;
      const assn = `${getFieldValue(it,'assignee') || '—'}`;
      const cat  = `${getFieldValue(it,'category') || '—'}`;
      const loc  = `${getFieldValue(it,'location') || '—'}`;
      return `
        <tr class="page">
          <td class="col-time">
            ${toTime(it.start_time)}
          </td>
          <td class="col-time">
            ${toTime(it.end_time)}
          </td>
          <td class="col-what">
            <div class="activity">${title}</div>
            ${desc}
            ${obs}
          </td>
          <td class="col-prov">${providers || '—'}</td>
          <td class="col-loc">${loc}</td>
          <td class="col-subj">${subj}</td>
          <td class="col-assignee">${assn}</td>
          <td class="col-cat">${cat}</td>
        </tr>
      `;
    }).join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docTitle}</title>
          ${styles}
        </head>
        <body>
          <div class="wrap">
            ${headerHtml}
            <table>
              <thead>
                <tr>
                  <th class="col-time">Hora inicio</th>
                  <th class="col-time">Hora fin</th>
                  <th class="col-what">Actividad / Descripción / Observaciones</th>
                  <th class="col-prov">Proveedor(es)</th>
                  <th class="col-loc">Ubicación</th>
                  <th class="col-subj">Sujeto</th>
                  <th class="col-assignee">Responsable</th>
                  <th class="col-cat">Categoría</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
          <div class="footer">
            <span>${eventHeader || 'Cronograma'}</span>
            <span style="float:right">Página <span class="page-num"></span></span>
          </div>
          <script>
            window.onload = () => {
              try { window.focus(); } catch(e) {}
              window.print();
            };
          </script>
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
          {options.assignees.map((o)=> (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <select className="px-2 py-2 rounded bg-white text-gray-900" value={fLoc} onChange={(e)=>setFLoc(e.target.value)}>
          <option value="">Ubicación (todas)</option>
          {options.locs.map((o)=> (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="secondary" onClick={() => setSortField('')}>Quitar orden</Button>
          <Button type="button" onClick={exportPDF}>Exportar PDF</Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-white/10 text-left">
              <th className="px-3 py-2">Hora inicio</th>
              <th className="px-3 py-2">Hora fin</th>
              <th className="px-3 py-2">Actividad</th>
              <th className="px-3 py-2">Proveedor(es)</th>
              <th className="px-3 py-2">Ubicación</th>
              <th className="px-3 py-2">Sujeto</th>
              <th className="px-3 py-2">Responsable</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-white/70">Cargando…</td>
              </tr>
            )}
            {!loading && view.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-white/70">{emptyMessage}</td>
              </tr>
            )}
            {!loading && view.map((it) => {
              const start = formatTime12(it.start_time);
              const end = formatTime12(it.end_time);
              const providers = (it.provider_ids || [])
                .map((id) => providersMap.get(id)?.name)
                .filter(Boolean)
                .join(', ');
              const subj = getFieldValue(it, 'subject') || '—';
              const cat = getFieldValue(it, 'category') || '—';
              const ass = getFieldValue(it, 'assignee') || '—';
              return (
                <tr key={it.id} className="border-b border-white/10">
                  <td className="px-3 py-2 whitespace-nowrap">{start || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{end || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{it.title || 'Sin título'}</div>
                    {it.description && <div className="text-white/70 text-xs">{it.description}</div>}
                    {it.observations && <div className="italic text-white/60 text-xs">Observaciones: {it.observations}</div>}
                  </td>
                  <td className="px-3 py-2">{providers || '—'}</td>
                  <td className="px-3 py-2">{it.location || '—'}</td>
                  <td className="px-3 py-2">{subj}</td>
                  <td className="px-3 py-2">{ass}</td>
                  <td className="px-3 py-2">{cat}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onEdit && onEdit(it)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete && onDelete(it)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
