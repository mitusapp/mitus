// src/pages/ProfileTasksPage.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Search, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import LoadingSpinner from '@/components/LoadingSpinner';
import ProfileTabsNav from '@/components/profile/ProfileTabsNav';
import ProfileHeaderBar from '@/components/profile/ProfileHeaderBar';

const SORT_DIR = { ASC: 'asc', DESC: 'desc' };

// Etiquetas amigables para tipos de evento (fallback si no existe event_type_label)
const EVENT_TYPE_LABELS = {
  boda: 'Boda',
  quince: 'Quince años',
  aniversario: 'Aniversario',
  bautizo: 'Bautizo',
  cumpleaños: 'Cumpleaños',
  baby_shower: 'Baby shower',
  otros: 'Otros',
};

const priorityBadge = (p) => {
  if (!p) return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">—</span>;
  const map = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${map[p] || map.low}`}>
      {p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta'}
    </span>
  );
};

const ProfileTasksPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const profileRef = useRef(null);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('due');
  const [sortDir, setSortDir] = useState(SORT_DIR.ASC);

  // ============== CARGA DE PERFIL ==============
  const fetchProfile = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data;
  }, [user]);

  // ============== LISTA (TASKS + PAYMENT SCHEDULES) ==============
  const fetchActionItems = useCallback(async () => {
    if (!user) return [];

    // 1) Eventos del usuario (en este esquema el dueño está en user_id)
    const { data: eventsData, error: evErr } = await supabase
      .from('events')
      .select('id, title, event_type, event_type_label, invitation_details')
      .eq('user_id', user.id);

    if (evErr || !eventsData?.length) return [];

    const eventIds = eventsData.map((e) => e.id);

    const eventMetaById = {};
    for (const ev of eventsData) {
      let hosts = [];
      try {
        const parsed =
          typeof ev.invitation_details === 'string'
            ? JSON.parse(ev.invitation_details || '{}')
            : (ev.invitation_details || {});
        hosts = Array.isArray(parsed.hosts) ? parsed.hosts.filter(Boolean) : [];
      } catch {
        hosts = [];
      }
      const client =
        hosts.length === 0
          ? (ev.title || '—')
          : hosts.length === 1
          ? hosts[0]
          : `${hosts.slice(0, -1).join(' y ')} y ${hosts.slice(-1)}`;

      const tipo = ev.event_type_label || EVENT_TYPE_LABELS[ev.event_type] || ev.event_type || '—';
      eventMetaById[ev.id] = { client, tipo };
    }

    // 2) Equipo (para “Responsable”)
    const { data: teamData } = await supabase
      .from('planner_team')
      .select('id, event_id, name')
      .in('event_id', eventIds);
    const teamById = {};
    (teamData || []).forEach((t) => (teamById[t.id] = t.name));

    const fallbackOwner =
      (profileRef.current?.full_name?.split(' ')?.[0]) || '—';

    // 3) Tareas (no completadas)
    const { data: tasksData } = await supabase
      .from('planner_tasks')
      .select('id, title, due_date, status, event_id, priority, category, assignee_team_id, visibility')
      .in('event_id', eventIds)
      .neq('status', 'completed');

    const taskItems = (tasksData || []).map((t) => {
      const meta = eventMetaById[t.event_id] || {};
      const responsable =
        (t.assignee_team_id && teamById[t.assignee_team_id]) || fallbackOwner;
      return {
        id: `task-${t.id}`,
        kind: 'task',
        pendiente: 'Tarea',
        client: meta.client || '—',
        tipo: meta.tipo || '—',
        task: t.title || 'Tarea',
        provider: t.category || null, // aquí usamos 'Categoría' de la tarea
        amount: null,
        due: t.due_date || null,
        prioridad: t.priority || null,
        owner: responsable,
      };
    });

    // 4) Presupuesto + Schedules de pago (pagos pendientes)
    const { data: budgetItems } = await supabase
      .from('planner_budget_items')
      .select('id, event_id, name, provider_id, priority, assignee_team_id, planner_providers(name)')
      .in('event_id', eventIds);

    const budgetById = {};
    (budgetItems || []).forEach((it) => (budgetById[it.id] = it));

    let paymentItems = [];
    const budgetIds = (budgetItems || []).map((b) => b.id);
    if (budgetIds.length) {
      const { data: schedules } = await supabase
        .from('planner_payment_schedules')
        .select('id, budget_item_id, amount, due_date, priority, assignee_team_id, status')
        .in('budget_item_id', budgetIds)
        .neq('status', 'paid');

      paymentItems = (schedules || [])
        .map((s) => {
          const bi = budgetById[s.budget_item_id];
          if (!bi) return null;
          const meta = eventMetaById[bi.event_id] || {};
          const proveedor = bi?.planner_providers?.name || bi?.name || 'Proveedor';
          const respId = s.assignee_team_id || bi.assignee_team_id;
          const responsable =
            (respId && teamById[respId]) || fallbackOwner;

          return {
            id: `pay-${s.id}`,
            kind: 'payment',
            pendiente: 'Pago',
            client: meta.client || '—',
            tipo: meta.tipo || '—',
            task: `Pago a ${proveedor}`,   // << cambio: "Pago a ..."
            provider: proveedor,           // lo mantenemos para búsquedas
            amount: s.amount ?? null,      // << añadimos amount para mostrar en paréntesis
            due: s.due_date || null,
            prioridad: s.priority || bi.priority || null,
            owner: responsable,
          };
        })
        .filter(Boolean);
    }

    return [...taskItems, ...paymentItems];
  }, [user]);

  // ============== EFECTO ÚNICO DE CARGA ==============
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!user) { setItems([]); setLoading(false); return; }
      setLoading(true);
      const prof = await fetchProfile();
      if (mounted) setProfile(prof);
      const list = await fetchActionItems();
      if (mounted) { setItems(list); setLoading(false); }
    };
    load();
    return () => { mounted = false; };
  }, [user, fetchProfile, fetchActionItems]);

  // ============== BUSCADOR & ORDEN ==============
  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const haystack = [
        it.client || '',
        it.tipo || '',
        it.pendiente || '',
        it.task || '',
        it.provider || '',
        it.owner || '',
        it.prioridad || '',
        it.amount != null ? String(it.amount) : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === SORT_DIR.ASC ? 1 : -1;
    const toTime = (v) => (v ? new Date(v).getTime() : Number.POSITIVE_INFINITY);

    arr.sort((a, b) => {
      switch (sortKey) {
        case 'client':
          return (a.client || '').localeCompare(b.client || '') * dir;
        case 'tipo':
          return (a.tipo || '').localeCompare(b.tipo || '') * dir;
        case 'pendiente':
          return (a.pendiente || '').localeCompare(b.pendiente || '') * dir;
        case 'task':
          return (a.task || '').localeCompare(b.task || '') * dir;
        case 'due':
          return (toTime(a.due) - toTime(b.due)) * dir;
        case 'prioridad': {
          const order = { high: 3, medium: 2, low: 1, null: 0, undefined: 0 };
          return ((order[a.prioridad] ?? 0) - (order[b.prioridad] ?? 0)) * dir;
        }
        case 'owner':
          return (a.owner || '').localeCompare(b.owner || '') * dir;
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((prev) => (prev === SORT_DIR.ASC ? SORT_DIR.DESC : SORT_DIR.ASC));
    else {
      setSortKey(key);
      setSortDir(SORT_DIR.ASC);
    }
  };

  // ============== RENDER HELPERS ==============
  const formatDueBadge = (due) => {
    if (!due) return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">—</span>;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(due); d.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
          {Math.abs(diffDays)} día(s) vencido
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
          {diffDays} día(s)
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
        {diffDays} día(s)
      </span>
    );
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* === Barra superior: identidad izquierda / acciones derecha === */}
          <ProfileHeaderBar
            profile={profile}
            greeting="Gestiona tus tareas."
            onEdit={() => navigate('/profile/edit')}
            onChat={() => console.log('Abrir chat')}
          />

          {/* === Barra de navegación sticky === */}
          <ProfileTabsNav />
          <div className="mt-6" />   {/* 24px aprox */}

          {/* === Contenido: Tareas === */}
          <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E1E1E] flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-[#B9A7F9]" /> Tareas
            </h1>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                placeholder="Buscar por anfitrión, tipo, pendiente, título, proveedor o responsable…"
                className="w-full p-2 pl-9 rounded-lg border border-gray-300 bg-white text-sm text-[#1E1E1E] focus:ring-2 focus:ring-[#9E7977]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar en lista de tareas y pagos"
              />
            </div>
          </div>

          {/* === LISTA === */}
          <div className="bg-white rounded-2xl border border-[#DCD9D6]">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[1040px]">
                <thead>
                  <tr className="border-b border-[#EDEAE7] text-sm text-[#5E5E5E]">
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('client')}>
                      <div className="flex items-center gap-2">Cliente <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('tipo')}>
                      <div className="flex items-center gap-2">Tipo <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('pendiente')}>
                      <div className="flex items-center gap-2">Pendiente <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('task')}>
                      <div className="flex items-center gap-2">Tarea / Pago <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('due')}>
                      <div className="flex items-center gap-2">Vencimiento <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('prioridad')}>
                      <div className="flex items-center gap-2">Prioridad <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                    <th className="p-3 cursor-pointer select-none" onClick={() => toggleSort('owner')}>
                      <div className="flex items-center gap-2">Responsable <ArrowUpDown className="w-4 h-4" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.id} className="border-b border-[#F3F1EF] hover:bg-[#FAF9F8]">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F5ECFF] text-[#7A49FF] text-sm font-semibold">👥</span>
                          <span className="font-medium text-[#1E1E1E]">{row.client}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[#1E1E1E]">{row.tipo}</span>
                      </td>
                      <td className="p-3">
                        {row.pendiente === 'Tarea' ? (
                          <span className="inline-flex items-center gap-1 text-[#7A49FF] text-sm">✍️ Tarea</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#1E7F46] text-sm">🧾 Pago</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-[#1E1E1E]">{row.task}</span>
                        {row.kind === 'payment' ? (
                          <span className="ml-2 text-xs text-[#7B7B7B]">
                            ({row.amount != null ? `$${Number(row.amount).toLocaleString()}` : '—'})
                          </span>
                        ) : (
                          row.provider && (
                            <span className="ml-2 text-xs text-[#7B7B7B]">({row.provider})</span>
                          )
                        )}
                      </td>
                      <td className="p-3">{formatDueBadge(row.due)}</td>
                      <td className="p-3">{priorityBadge(row.prioridad)}</td>
                      <td className="p-3 text-[#1E1E1E]">{row.owner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sorted.length === 0 && (
                <p className="text-center text-[#5E5E5E] py-12">No hay resultados para tu búsqueda.</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileTasksPage;
