// src/pages/planner/PlannerBudget.jsx (con export PDF refinado)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, FileDown, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

import BudgetSummary from '@/components/planner/BudgetSummary.jsx';
import BudgetList from '@/components/planner/BudgetList.jsx';
import BudgetFormModal from '@/components/planner/BudgetFormModal.jsx';
import BudgetPaymentsModal from '@/components/planner/BudgetPaymentsModal.jsx';

// ==== Helpers de fecha/moneda ====
const parseLocalYMD = (s) => {
  if (!s) return null;
  if (typeof s === 'string') {
    const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:T.*)?$/);
    if (m) {
      const [y, mth, d] = m[1].split('-').map(Number);
      const dt = new Date(y, mth - 1, d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    }
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
};

const formatShortEsDate = (val) => {
  const d = parseLocalYMD(val);
  return d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};

// Etiquetas del tipo de evento (mismo mapa usado en PlannerTasks)
const EVENT_TYPE_LABELS = {
  boda: 'Boda',
  quince: 'Quince Años',
  cumpleanos: 'Cumpleaños',
  corporativo: 'Corporativo',
  babyshower: 'Baby Shower',
  aniversario: 'Aniversario',
  otro: 'Otro Evento',
};

const PRIORITY_LABELS = { low: 'Baja', medium: 'Media', high: 'Alta' };
const labelFromPriority = (p) => PRIORITY_LABELS[p] || p || '';

// Catálogo de categorías (para label en export y búsqueda)
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
const labelFromServiceType = (value) =>
  SERVICE_TYPES.find((s) => s.value === value)?.label || value || '';

// Normalizador tolerante a tildes para el buscador
const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const fmtMoney = (n, currency = 'COP', locale = 'es-CO') => {
  const v = Number(n || 0);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(v);
  } catch {
    return `$${v.toLocaleString(locale)}`;
  }
};

export default function PlannerBudget() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Encabezado estilo PlannerTasks (hosts + fecha)
  const [eventHeader, setEventHeader] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [currencyLocale, setCurrencyLocale] = useState('es-CO');

  // Estado de datos
  const [budgetItems, setBudgetItems] = useState([]);
  const [paymentsByItem, setPaymentsByItem] = useState({}); // { id: [payments] }
  const [schedulesByItem, setSchedulesByItem] = useState({}); // { id: [schedules] }
  const [providers, setProviders] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [loading, setLoading] = useState(true);

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // Datos del formulario
  const [formData, setFormData] = useState({
    category: '', name: '', description: '',
    unit_cost: 0, quantity: 1, actual_cost: 0,
    provider_id: null, priority: null, assignee_team_id: null,
  });
  const [scheduleRows, setScheduleRows] = useState([]);

  // Buscador
  const [query, setQuery] = useState('');

  // --- Info del evento (hosts, tipo, fecha, moneda) ---
  const fetchEventInfo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, event_type, event_type_label, invitation_details, currency_code')
        .eq('id', eventId)
        .single();
      if (error) throw error;

      const hostsArr = data?.invitation_details?.hosts;
      const hosts = Array.isArray(hostsArr) && hostsArr.length
        ? hostsArr.join(' y ')
        : (data?.title || '');
      const typeLabel = EVENT_TYPE_LABELS[data?.event_type] || data?.event_type_label || 'Evento';
      const dateLabel = formatShortEsDate(data?.date);
      const header = `${typeLabel}${hosts ? ` de ${hosts}` : ''}${dateLabel ? ` – ${dateLabel}` : ''}`;
      setEventHeader(header);

      const ccy = data?.currency_code || 'COP';
      setCurrency(ccy);
      setCurrencyLocale(ccy === 'USD' ? 'en-US' : ccy === 'EUR' ? 'es-ES' : 'es-CO');
    } catch (e) {
      setEventHeader('');
      setCurrency('COP');
    }
  }, [eventId]);

  // --- Carga de datos principal ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('planner_budget_items')
        .select('*, planner_providers(name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (budgetError) throw budgetError;
      setBudgetItems(budgetData || []);

      const ids = (budgetData || []).map((b) => b.id);

      if (ids.length) {
        const [{ data: pays, error: payErr }, { data: sched, error: schedErr }] = await Promise.all([
          supabase.from('planner_payments').select('*').in('budget_item_id', ids),
          supabase.from('planner_payment_schedules').select('*').in('budget_item_id', ids).order('installment_no', { ascending: true }),
        ]);
        if (payErr) throw payErr;
        if (schedErr) throw schedErr;
        const byItemP = (pays || []).reduce((acc, p) => { (acc[p.budget_item_id] ||= []).push(p); return acc; }, {});
        const byItemS = (sched || []).reduce((acc, r) => { (acc[r.budget_item_id] ||= []).push(r); return acc; }, {});
        setPaymentsByItem(byItemP);
        setSchedulesByItem(byItemS);
      } else {
        setPaymentsByItem({});
        setSchedulesByItem({});
      }

      const { data: providersData, error: providersErr } = await supabase
        .from('event_providers')
        .select('planner_providers(*)')
        .eq('event_id', eventId);
      if (providersErr) throw providersErr;
      setProviders((providersData || []).map((p) => p.planner_providers));

      const { data: teamData, error: teamErr } = await supabase
        .from('planner_team')
        .select('id, name')
        .eq('event_id', eventId)
        .order('name', { ascending: true });
      if (teamErr) throw teamErr;
      setTeamMembers(teamData || []);
    } catch (e) {
      console.error(e);
      toast({ title: 'Error al cargar presupuesto', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => { fetchEventInfo(); }, [fetchEventInfo]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Totales + métricas para BudgetSummary ---
  const totals = useMemo(() => {
    const estimated = (budgetItems || []).reduce((s, it) => s + Number(it.estimated_cost || 0), 0);
    const actual = (budgetItems || []).reduce((s, it) => s + Number(it.actual_cost || it.estimated_cost || 0), 0);

    const paid = Object.values(paymentsByItem).flat().reduce((s, p) => s + Number(p.amount || 0), 0);
    const scheduledTotal = Object.values(schedulesByItem).flat().reduce((s, r) => s + Number(r.amount || 0), 0);

    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Mapa: pagado por item
    const paidByItem = {};
    Object.entries(paymentsByItem).forEach(([bid, arr]) => {
      paidByItem[bid] = (arr || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    });

    let overdueCount = 0;
    let overdueAmount = 0;

    // Próximo vencimiento global (primero futuro; si no hay, el más cercano sin pagar)
    let nextDueDate = null;
    let nextDueAmount = null;
    let earliestAnyDate = null;
    let earliestAnyAmount = null;

    Object.entries(schedulesByItem).forEach(([bid, rows]) => {
      const sorted = [...(rows || [])].map(r => ({
        ...r,
        _amount: Number(r.amount || 0),
        _due: parseLocalYMD(r.due_date),
      })).sort((a, b) => {
        if (a.installment_no && b.installment_no) return a.installment_no - b.installment_no;
        if (a._due && b._due) return a._due - b._due;
        return 0;
      });

      let remainingPaid = paidByItem[bid] || 0;

      sorted.forEach(r => {
        const covered = Math.min(remainingPaid, r._amount);
        const remainThis = Math.max(0, r._amount - covered);
        remainingPaid = Math.max(0, remainingPaid - r._amount);

        if (remainThis > 0) {
          // overdue
          if (r._due && r._due < today) {
            overdueCount += 1;
            overdueAmount += remainThis;
          }

          // candidate upcoming
          if (r._due && r._due >= today) {
            if (!nextDueDate || r._due < nextDueDate) {
              nextDueDate = r._due;
              nextDueAmount = remainThis;
            }
          }

          // keep earliest unpaid (sin importar si es pasado/futuro)
          if (r._due) {
            if (!earliestAnyDate || r._due < earliestAnyDate) {
              earliestAnyDate = r._due;
              earliestAnyAmount = remainThis;
            }
          }
        }
      });
    });

    // Si no hay próxima futura, usamos la más cercana sin pagar (aunque sea pasada)
    if (!nextDueDate && earliestAnyDate) {
      nextDueDate = earliestAnyDate;
      nextDueAmount = earliestAnyAmount || 0;
    }

    const diff = estimated - actual;
    return {
      estimated,
      actual,
      paid,
      diff,
      scheduledTotal,
      overdueAmount,
      overdueCount,
      nextDueAmount,
      nextDueDate,
    };
  }, [budgetItems, paymentsByItem, schedulesByItem]);

  // --- Abrir/cerrar modales ---
  const openCreate = () => {
    setCurrentItem(null);
    setFormData({
      category: '',
      name: '',
      description: '',
      unit_cost: 0,
      quantity: 1,
      actual_cost: 0,
      provider_id: null,
      priority: null,
      assignee_team_id: null,
    });
    setScheduleRows([]);
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setCurrentItem(item);
    setFormData({
      category: item.category || '',
      name: item.name || '',
      description: item.description || '',
      unit_cost: item.unit_cost ?? 0,
      quantity: item.quantity ?? 1,
      actual_cost: item.actual_cost ?? 0,
      provider_id: item.provider_id || null,
      priority: item.priority || null,
      assignee_team_id: item.assignee_team_id || null,
    });
    const sched = (schedulesByItem[item.id] || []).map((s) => ({
      amount: Number(s.amount || 0),
      due_date: typeof s.due_date === 'string' ? s.due_date.split('T')[0] : s.due_date,
      priority: s.priority || null,
      assignee_team_id: s.assignee_team_id || null,
    }));
    setScheduleRows(sched);
    setIsFormOpen(true);
  };

  const openPayments = (item) => { setCurrentItem(item); setIsPaymentsOpen(true); };

  // --- Guardar / eliminar / pagos ---
  const saveItem = async () => {
    const payload = {
      ...formData,
      event_id: eventId,
      actual_cost: Number(formData.actual_cost ?? 0),
      provider_id: formData.provider_id || null,
      priority: formData.priority || null,
      assignee_team_id: formData.assignee_team_id || null,
    };

    try {
      let itemId;
      if (currentItem) {
        const { error } = await supabase.from('planner_budget_items').update(payload).eq('id', currentItem.id);
        if (error) throw error;
        itemId = currentItem.id;
      } else {
        const { data, error } = await supabase.from('planner_budget_items').insert(payload).select('id').single();
        if (error) throw error;
        itemId = data.id;
      }

      if (Array.isArray(scheduleRows)) {
        await supabase.from('planner_payment_schedules').delete().eq('budget_item_id', itemId);
        const rows = scheduleRows
          .filter((r) => Number(r.amount) > 0 && r.due_date)
          .map((r, idx) => ({
            budget_item_id: itemId,
            installment_no: idx + 1,
            amount: Number(r.amount),
            due_date: typeof r.due_date === 'string' ? r.due_date.split('T')[0] : r.due_date,
            priority: r.priority || null,
            assignee_team_id: r.assignee_team_id || null,
            status: 'upcoming',
          }));
        if (rows.length) {
          const { error: schedErr } = await supabase.from('planner_payment_schedules').insert(rows);
          if (schedErr) throw schedErr;
        }
      }

      toast({ title: `Gasto ${currentItem ? 'actualizado' : 'creado'}` });
      setIsFormOpen(false);
      fetchData();
    } catch (e) {
      toast({ title: 'Error al guardar gasto', description: e.message, variant: 'destructive' });
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este gasto?')) return;
    const { error } = await supabase.from('planner_budget_items').delete().eq('id', id);
    if (error) toast({ title: 'Error al eliminar gasto', variant: 'destructive' });
    else { toast({ title: 'Gasto eliminado' }); fetchData(); }
  };

  const addPayment = async ({ amount, payment_date }) => {
    if (!currentItem) return;
    const payload = { budget_item_id: currentItem.id, amount: Number(amount), payment_date };
    const { error } = await supabase.from('planner_payments').insert(payload);
    if (error) toast({ title: 'Error al añadir pago', variant: 'destructive' });
    else { toast({ title: 'Pago añadido' }); fetchData(); }
  };

  const deletePayment = async (paymentId) => {
    const { error } = await supabase.from('planner_payments').delete().eq('id', paymentId);
    if (error) toast({ title: 'Error al eliminar pago', variant: 'destructive' });
    else { toast({ title: 'Pago eliminado' }); fetchData(); }
  };

  // === Buscador (filtra items por campos propios + schedules / provider / team) ===
  const teamMap = useMemo(() => {
    const m = {};
    (teamMembers || []).forEach((t) => { m[t.id] = t.name; });
    return m;
  }, [teamMembers]);

  const filteredItems = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return budgetItems;
    return (budgetItems || []).filter((it) => {
      const prov = it?.planner_providers?.name || '';
      const sched = schedulesByItem[it.id] || [];
      const schedText = sched.map((r) => {
        const assn = r.assignee_team_id ? (teamMap[r.assignee_team_id] || '') : '';
        return [
          r.amount != null ? String(r.amount) : '',
          r.due_date || '',
          r.priority || '',
          assn,
        ].join(' ');
      }).join(' ');
      const hay = norm([
        it.name || '',
        labelFromServiceType(it.category),
        it.category || '',
        it.description || '',
        prov,
        it.priority || '',
        it.assignee_team_id ? (teamMap[it.assignee_team_id] || '') : '',
        it.actual_cost != null ? String(it.actual_cost) : '',
        schedText,
      ].join(' '));
      return hay.includes(q);
    });
  }, [budgetItems, schedulesByItem, teamMap, query]);

  // === Exportar PDF: profesional y compacto (sin cambiar contenido) ===
  const exportPDF = () => {
    try {
      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: 'No se pudo abrir la ventana de impresión', variant: 'destructive' });
        return;
      }

      // 1) Preparar filas (por cuota), manteniendo el mismo contenido que la tabla actual
      const rows = [];
      (budgetItems || []).forEach((it) => {
        const sched = (schedulesByItem[it.id] || []).slice().sort((a, b) => {
          const da = parseLocalYMD(a.due_date);
          const db = parseLocalYMD(b.due_date);
          if (da && db) return da - db;
          return (a.installment_no || 0) - (b.installment_no || 0);
        });
        if (sched.length === 0) {
          rows.push({
            name: it.name || '',
            category: labelFromServiceType(it.category),
            description: it.description || '',
            provider: it.planner_providers?.name || '',
            priority: labelFromPriority(it.priority || ''),
            assignee: it.assignee_team_id ? (teamMap[it.assignee_team_id] || '') : '',
            due: '',
            amount: it.actual_cost || it.estimated_cost || 0,
          });
        } else {
          sched.forEach((r, idx) => {
            rows.push({
              name: `${it.name || ''} ${sched.length > 1 ? `(Cuota ${idx + 1})` : ''}`,
              category: labelFromServiceType(it.category),
              description: it.description || '',
              provider: it.planner_providers?.name || '',
              priority: labelFromPriority(r.priority || it.priority || ''),
              assignee: r.assignee_team_id ? (teamMap[r.assignee_team_id] || '') : (it.assignee_team_id ? (teamMap[it.assignee_team_id] || '') : ''),
              due: parseLocalYMD(r.due_date)?.toLocaleDateString() || '',
              amount: Number(r.amount || 0),
            });
          });
        }
      });

      // 2) Derivar título del documento a partir de eventHeader
      const header = (eventHeader || '').trim();
      // Posibles formas: "Boda de X y Y – 15/10/2025" o similares
      let type = '';
      let hosts = '';
      let dateStr = '';
      const m = header.match(/^\s*([^–]+?)(?:\s+de\s+([^–]+?))?(?:\s+–\s+(\d{2}\/\d{2}\/\d{4}))?\s*$/i);
      if (m) {
        type = (m[1] || '').trim();
        hosts = (m[2] || '').trim();
        dateStr = (m[3] || '').trim();
      }
      // Normalizar fecha DD/MM/YYYY → DD-MM-YYYY; si no hay, usa la más temprana de cuotas
      if (dateStr) {
        dateStr = dateStr.replaceAll('/', '-');
      } else {
        const allDue = Object.values(schedulesByItem).flat().map((r) => parseLocalYMD(r.due_date)).filter(Boolean).sort((a,b)=>a-b);
        if (allDue[0]) {
          const d = allDue[0];
          dateStr = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
        }
      }
      const sanitize = (s) => (s || '').replace(/[\/:*?"<>|]+/g, ' ').trim();
      const docTitle = sanitize(['Presupuesto', type, hosts, dateStr].filter(Boolean).join(' '));

      // 3) Estilos de impresión profesionales (thead repetible, filas compactas, sin footer fijo)
      const css = `
        <style>
          :root{ --ink:#0f172a; --muted:#64748b; --border:#e5e7eb; --bg:#ffffff; --head:#f8fafc; }
          *{ box-sizing:border-box; }
          html,body{ margin:0; padding:0; background:var(--bg); color:var(--ink); }
          body{ font-family: ui-sans-serif, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Liberation Sans', sans-serif; font-size:12px; line-height:1.45; }
          @page{ margin:16mm 12mm 16mm 12mm; }

          .wrap{ padding:20px 24px; }
          .header{ padding:0 0 10px 0; border-bottom:1px solid var(--border); margin-bottom:12px; }
          .title{ font-size:18px; font-weight:800; letter-spacing:.2px; text-transform:uppercase; }
          .sub{ color:var(--muted); font-size:12px; margin-top:4px; }
          .meta{ color:var(--muted); font-size:11px; margin-top:4px; }

          .cards{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px; margin:12px 0 14px; }
          .card{ border:1px solid var(--border); border-radius:10px; padding:10px; background:#fafafa; }
          .label{ font-size:11px; color:#6b7280; }
          .value{ font-weight:800; font-size:16px; }
          .small{ font-size: 10px; color:#555; }

          table{ width:100%; border-collapse: collapse; page-break-inside:auto; }
          thead{ display:table-header-group; }
          tfoot{ display:table-footer-group; }
          th, td { border-bottom:1px solid var(--border); padding:6px 8px; font-size:12px; text-align:left; vertical-align:top; }
          th { background:var(--head); color:#374151; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:.3px; }
          tr { page-break-inside: avoid; break-inside: avoid; }
        </style>
      `;

      // 4) Header (título) + resumen (mismo contenido) + tabla detallada
      const now = new Date();
      const genAt = now.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' });

      const summaryHtml = `
        <div class="cards">
          <div class="card">
            <div class="label">Programado</div>
            <div class="value">${fmtMoney(totals.scheduledTotal, currency, currencyLocale)}</div>
            <div class="small">Suma de cuotas</div>
          </div>
          <div class="card">
            <div class="label">Pagado</div>
            <div class="value">${fmtMoney(totals.paid, currency, currencyLocale)}</div>
          </div>
          <div class="card">
            <div class="label">Próximo vencimiento</div>
            <div class="value">${totals.nextDueDate ? (totals.nextDueDate.toLocaleDateString() + ' · ' + fmtMoney(totals.nextDueAmount || 0, currency, currencyLocale)) : '—'}</div>
            <div class="small">Cuotas vencidas: ${totals.overdueCount} · Monto vencido: ${fmtMoney(totals.overdueAmount, currency, currencyLocale)}</div>
          </div>
        </div>
      `;

      const tableHeader = `
        <thead>
          <tr>
            <th>Gasto</th>
            <th>Categoría</th>
            <th>Descripción</th>
            <th>Proveedor</th>
            <th>Prioridad</th>
            <th>Responsable</th>
            <th>Vencimiento</th>
            <th>Monto</th>
          </tr>
        </thead>
      `;

      const tableBody = `
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>${r.name || ''}</td>
              <td>${r.category || ''}</td>
              <td>${r.description || ''}</td>
              <td>${r.provider || ''}</td>
              <td>${r.priority || ''}</td>
              <td>${r.assignee || ''}</td>
              <td>${r.due || ''}</td>
              <td>${fmtMoney(r.amount || 0, currency, currencyLocale)}</td>
            </tr>
          `).join('')}
        </tbody>
      `;

      win.document.write(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            ${css}
            <title>${docTitle || (eventHeader || 'Presupuesto')}</title>
          </head>
          <body>
            <div class="wrap">
              <div class="header">
                <div class="title">Presupuesto y Pagos</div>
                <div class="sub">${eventHeader || ''}</div>
                <div class="meta">Generado: ${genAt}</div>
              </div>
              ${summaryHtml}
              <table>
                ${tableHeader}
                ${tableBody}
              </table>
            </div>
            <script>
              window.onload = () => { try { window.focus(); } catch(e) {} window.print(); };
            </script>
          </body>
        </html>
      `);
      win.document.close();
    } catch (e) {
      console.error(e);
      toast({ title: 'No se pudo exportar el PDF', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header (alineado a PlannerTasks) */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Presupuesto y Pagos</h1>
                {eventHeader && (
                  <p className="text-xs sm:text-sm text-gray-300 mt-0.5 break-words">{eventHeader}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportPDF} variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
              <Button onClick={openCreate} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="w-4 h-4 mr-2" /> Nuevo Gasto
              </Button>
            </div>
          </div>

          {/* Summary (pasa métricas nuevas) */}
          <BudgetSummary
            estimated={totals.estimated}
            actual={totals.actual}
            paid={totals.paid}
            overdueAmount={totals.overdueAmount}
            scheduledTotal={totals.scheduledTotal}
            nextDueAmount={totals.nextDueAmount}
            nextDueDate={totals.nextDueDate}
            overdueCount={totals.overdueCount}
            currency={currency}
            locale={currencyLocale}
          />

          {/* Buscador (estilo PlannerTasks) */}
          <div className="relative mb-6 mt-2">
            <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 rounded bg-white/10 border border-white/20 placeholder:text-gray-400 text-white"
              placeholder="Buscar por nombre, categoría, descripción, proveedor, responsable, prioridad, cuota o fecha…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* List */}
          {loading ? (
            <div className="text-center text-white">Cargando presupuesto...</div>
          ) : (
            <BudgetList
              items={filteredItems}
              paymentsByItem={paymentsByItem}
              schedulesByItem={schedulesByItem}
              teamMembers={teamMembers}
              onOpenPayments={openPayments}
              onEdit={openEdit}
              onDelete={deleteItem}
              currency={currency}
              locale={currencyLocale}
            />
          )}
        </motion.div>
      </div>

      {/* Modales */}
      <BudgetFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={currentItem ? 'Editar Gasto' : 'Crear Gasto'}
        formData={formData}
        setFormData={setFormData}
        providers={providers}
        teamMembers={teamMembers}
        scheduleRows={scheduleRows}
        setScheduleRows={setScheduleRows}
        onSubmit={saveItem}
      />

      {currentItem && (
        <BudgetPaymentsModal
          open={isPaymentsOpen}
          onOpenChange={setIsPaymentsOpen}
          budgetItem={currentItem}
          payments={paymentsByItem[currentItem.id] || []}
          schedules={schedulesByItem[currentItem.id] || []}
          teamMembers={teamMembers}
          onAddPayment={addPayment}
          onDeletePayment={deletePayment}
          currency={currency}
          locale={currencyLocale}
        />
      )}
    </div>
  );
}
