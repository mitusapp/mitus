// src/components/planner/TimelineList.jsx
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { useCategories } from '@/features/categories/useCategories';
import SearchableSelect from '@/components/common/SearchableSelect.jsx';

export default function TimelineList({
  items = [],
  onEdit,
  onDelete,
  labelFromServiceType,
  labelFromSubject,
  teamMembers = [],
  providersMap = new Map(),
  loading = false,
  emptyMessage = 'No hay actividades en el cronograma.',
  eventHeader = '', // para encabezado del PDF
}) {
  // -------------------- Estado de filtros y orden --------------------
  const [fProv, setFProv] = useState('');  // 👈 nuevo: filtro por proveedor
  const [fCat, setFCat] = useState('');
  const [fSubj, setFSubj] = useState('');
  const [fAssignee, setFAssignee] = useState('');
  const [fLoc, setFLoc] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  // 📚 Categorías en memoria (una sola carga; lookup O(1))
  const { byId } = useCategories();
  const getCategoryLabel = (id) => {
    if (!id) return '';
    const c = byId[id];
    if (!c) return '';
    const p = c.parent_id ? byId[c.parent_id] : null;
    return p ? `${p.name} › ${c.name}` : c.name;
  };

  // Mapa rápido de id → nombre + rol del equipo
  const teamMap = useMemo(() => {
    const m = new Map();
    (teamMembers || []).forEach((t) => {
      const label = t?.role ? `${t.name}, ${t.role}` : (t.name || '—');
      m.set(t.id, label);
    });
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

  // ✅ Label visible de categoría priorizando BD; fallback a catálogo legado o string plano
  const catLabelForItem = (it) =>
    getCategoryLabel(it.category_id) ||
    (labelFromServiceType ? (labelFromServiceType(it.category) || '') : '') ||
    it.category ||
    '';

  const getFieldValue = (it, field) => {
    switch (field) {
      case 'category':
        return catLabelForItem(it);
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
    const provs = new Map(); // 👈 nuevo: opciones de proveedores

    (items || []).forEach((it) => {
      const catLabel = catLabelForItem(it);
      if (catLabel) cats.set(catLabel, catLabel); // valor = label visible
      if (it.subject) subjs.set(it.subject, labelFromSubject ? (labelFromSubject(it.subject) || it.subject) : it.subject);
      if (it.location) locs.set(it.location, it.location);
      if (it.assignee_team_id) assignees.set(String(it.assignee_team_id), teamMap.get(it.assignee_team_id) || '');

      // recolectar proveedores desde los items
      (it.provider_ids || []).forEach((pid) => {
        const name = providersMap.get(pid)?.name;
        if (name) provs.set(String(pid), name);
      });
    });

    return {
      provs: Array.from(provs, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      cats: Array.from(cats, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      subjs: Array.from(subjs, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      locs: Array.from(locs, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
      assignees: Array.from(assignees, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })),
    };
  }, [items, labelFromSubject, teamMap, providersMap]);

  const view = useMemo(() => {
    const filtered = (items || []).filter((it) => {
      // 👇 nuevo: filtro por proveedor (compara por id como string)
      if (fProv) {
        const provIds = (it.provider_ids || []).map(String);
        if (!provIds.includes(String(fProv))) return false;
      }
      if (fCat && catLabelForItem(it) !== fCat) return false; // filtra por label visible
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
  }, [items, fProv, fCat, fSubj, fAssignee, fLoc, sortField, sortDir]);

  // -------------------- Exportar PDF --------------------
  const exportPDF = () => {
    const rows = view; // ya viene filtrado y ordenado
    const win = window.open('', '_blank');
    if (!win) return;

    // ---- Título de documento (usa header, evita duplicar fecha del evento y añade fecha de creación) ----
    const headerForTitle = (eventHeader || '').trim() || 'Evento';

    // ¿El header ya tiene una fecha tipo dd/mm/aaaa?
    const hasDateInHeader = /\b\d{2}\/\d{2}\/\d{4}\b/.test(headerForTitle);

    // Si el header NO trae fecha, usamos la primera start_date (yyyy-mm-dd) y la mostramos como dd-mm-aaaa
    let eventDateForTitle = '';
    if (!hasDateInHeader) {
      const earliest = (rows || []).map(it => it.start_date).filter(Boolean).sort()[0];
      if (earliest && /^\d{4}-\d{2}-\d{2}$/.test(earliest)) {
        const [y, m, d] = earliest.split('-');
        eventDateForTitle = `${d}-${m}-${y}`;
      }
    }

    // Fecha de creación (hoy) para añadir entre paréntesis, formato seguro para nombre de archivo
    const nowTitle = new Date();
    const todayForTitle =
      `${String(nowTitle.getDate()).padStart(2, '0')}-${String(nowTitle.getMonth() + 1).padStart(2, '0')}-${nowTitle.getFullYear()}`;

    const titleCore = `Cronograma ${headerForTitle}${eventDateForTitle ? ` ${eventDateForTitle}` : ''}`;
    // → Añadimos la fecha de creación entre paréntesis
    const rawTitle = `${titleCore} (${todayForTitle})`;

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



    const styles = `
      <style>
        :root{
          --ink:#0f172a;       /* slate-900 */
          --muted:#64748b;     /* slate-500 */
          --border:#e5e7eb;    /* gray-200 */
          --bg:#ffffff;        /* white */
          --head:#f8fafc;      /* slate-50 */
          --accent:#111827;    /* gray-900 */
          --obs:#a16207;       /* amber-700 */
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
        .title{ font-size:18px; font-weight:800; letter-spacing:.2px; text-transform:uppercase; }
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
        .col-subj, .col-assignee{ width:120px; }

        tr{ page-break-inside:avoid; break-inside:avoid; }
        .activity{ font-weight:700; }
        .muted{ color:var(--muted); }
        .obs{ color:var(--obs); font-weight:600; }

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

        @media print{
          @page{ margin:16mm 12mm 16mm 12mm; }
          .wrap{ padding:0; }
          th, td{ padding:6px 8px; }
          .footer{ display:none; }
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
      const obs = it.observations ? `<div class="obs">Observaciones: ${it.observations}</div>` : '';
      const subj = `${getFieldValue(it, 'subject') || '—'}`;
      const assn = `${getFieldValue(it, 'assignee') || '—'}`;
      const loc = `${getFieldValue(it, 'location') || '—'}`;
      return `
        <tr class="page">
          <td class="col-time">${toTime(it.start_time)}</td>
          <td class="col-time">${toTime(it.end_time)}</td>
          <td class="col-what">
            <div class="activity">${title}</div>
            ${desc}
            ${obs}
          </td>
          <td class="col-prov">${providers || '—'}</td>
          <td class="col-loc">${loc}</td>
          <td class="col-subj">${subj}</td>
          <td class="col-assignee">${assn}</td>
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
                  <th class="col-subj">Participante(s)</th>
                  <th class="col-assignee">Responsable</th>
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
            window.onload = () => { try { window.focus(); } catch(e) {} window.print(); };
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
      <div className="p-3 md:p-4 bg-white/5 border-b border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <SearchableSelect
            label="Proveedor"
            value={fProv}
            onChange={setFProv}
            options={options.provs}
            placeholder="Todos"
          />

          <SearchableSelect
            label="Categoría"
            value={fCat}
            onChange={setFCat}
            options={options.cats}
            placeholder="Todas"
          />

          <SearchableSelect
            label="Participante(s)"
            value={fSubj}
            onChange={setFSubj}
            options={options.subjs}
            placeholder="Todos"
          />

          <SearchableSelect
            label="Responsable"
            value={fAssignee}
            onChange={setFAssignee}
            options={options.assignees}
            placeholder="Todos"
          />

          <SearchableSelect
            label="Ubicación"
            value={fLoc}
            onChange={setFLoc}
            options={options.locs}
            placeholder="Todas"
          />

          <div className="flex justify-end">
            <Button type="button" onClick={exportPDF}>Exportar PDF</Button>
          </div>
        </div>
      </div>


      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-white/10 text-left">
              <th className="px-3 py-2">Hora inicio</th>
              <th className="px-3 py-2">Hora fin</th>
              <th className="px-3 py-2">Actividad / Descripción / Observaciones</th>
              <th className="px-3 py-2">Proveedor(es)</th>
              <th className="px-3 py-2">Ubicación</th>
              <th className="px-3 py-2">Participante(s)</th>
              <th className="px-3 py-2">Responsable</th>
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
              const ass = getFieldValue(it, 'assignee') || '—';
              return (
                <tr key={it.id} className="border-b border-white/10">
                  <td className="px-3 py-2 whitespace-nowrap">{start || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{end || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{it.title || 'Sin título'}</div>
                    {it.description && <div className="text-white/70 text-xs">{it.description}</div>}
                    {it.observations && (
                      <div className="text-amber-300 text-xs font-semibold">
                        Observaciones: {it.observations}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{providers || '—'}</td>
                  <td className="px-3 py-2">{it.location || '—'}</td>
                  <td className="px-3 py-2">{subj}</td>
                  <td className="px-3 py-2">{ass}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => onEdit && onEdit(it)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDelete && onDelete(it.id)}>
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
