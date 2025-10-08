// src/pages/ProfilePage.jsx
import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Percent,
  Trash2,
  Sparkles,
  Search,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDevHelper } from '@/contexts/DevHelperContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import ProfileTabsNav from '@/components/profile/ProfileTabsNav';
import ProfileHeaderBar from '@/components/profile/ProfileHeaderBar';

// 🔻 React Query
import { useQuery, useQueryClient } from '@tanstack/react-query';

const eventTypeLabels = {
  boda: 'Boda',
  quince: 'Quince Años',
  cumpleanos: 'Cumpleaños',
  corporativo: 'Corporativo',
  babyshower: 'Baby Shower',
  aniversario: 'Aniversario',
  otro: 'Otro Evento',
};

const normalizeText = (text = '') =>
  (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('full_name, email, avatar_url, phone')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

const fetchEvents = async (userId) => {
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, title, date, cover_image_url, event_type, event_type_label, invitation_details,
      planner_tasks ( status, due_date )
    `)
    .eq('user_id', userId);
  if (error) throw error;
  return data || [];
};

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isDevHelperVisible, setIsDevHelperVisible } = useDevHelper();

  // === Queries ===
  const {
    data: profile,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  const {
    data: rawEvents,
    isLoading: eventsLoading,
  } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: () => fetchEvents(user.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 min
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // refetchOnMount: 'always',
  });

  // ✅ Escuchar cambios desde el Wizard (crear/editar) y refrescar lista
  useEffect(() => {
    const onEventsChanged = (e) => {
      const d = e?.detail || {};
      if (!user?.id || !d?.id) {
        // Igual forzamos un refetch por si acaso
        queryClient.invalidateQueries({ queryKey: ['events', user?.id] });
        return;
      }

      // 🟣 Actualización optimista del caché
      queryClient.setQueryData(['events', user.id], (prev) => {
        if (!Array.isArray(prev)) return prev;

        const idx = prev.findIndex((ev) => ev.id === d.id);
        if (idx >= 0) {
          const current = prev[idx] || {};
          const currentInv = current.invitation_details || {};
          const next = {
            ...current,
            title: d.title ?? current.title,
            date: d.date ?? current.date,
            event_type: d.event_type ?? current.event_type,
            cover_image_url: d.cover_image_url ?? current.cover_image_url,
            invitation_details: {
              ...currentInv,
              hosts: Array.isArray(d.hosts) ? d.hosts : (currentInv.hosts || []),
            },
          };
          const copy = prev.slice();
          copy[idx] = next;
          return copy;
        }

        // Si es inserción y no está en la lista, lo agregamos arriba
        if (d.kind === 'insert') {
          const added = {
            id: d.id,
            title: d.title || '',
            date: d.date || '',
            event_type: d.event_type || '',
            cover_image_url: d.cover_image_url || null,
            invitation_details: { hosts: Array.isArray(d.hosts) ? d.hosts : [] },
            planner_tasks: [],
          };
          return [added, ...prev];
        }

        return prev;
      });

      // 🔁 Y luego refetch para tener datos 100% consistentes del servidor
      queryClient.invalidateQueries({ queryKey: ['events', user.id] });
    };

    window.addEventListener('events:changed', onEventsChanged);
    return () => window.removeEventListener('events:changed', onEventsChanged);
  }, [queryClient, user?.id]);

  // === Derivados y UI ===
  const events = useMemo(() => {
    const list = rawEvents || [];
    return list.map((event) => {
      const tasks = event.planner_tasks || [];
      const total = tasks.length;
      const done = tasks.filter((t) => t.status === 'completed').length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const upcoming = tasks
        .filter((t) => t.status !== 'completed' && t.due_date)
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      const next_task_due = upcoming.length ? upcoming[0].due_date : null;
      return { ...event, progress, next_task_due };
    });
  }, [rawEvents]);

  const [filter, setFilter] = React.useState('all');
  const [sort, setSort] = React.useState('upcoming');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    if (searchQuery) {
      const q = normalizeText(searchQuery);
      result = result.filter((event) => {
        const hosts = event.invitation_details?.hosts?.join(' ') || '';
        const title = event.title || '';
        return normalizeText(hosts).includes(q) || normalizeText(title).includes(q);
      });
    }

    if (filter !== 'all') {
      result = result.filter((event) => event.event_type === filter);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (sort) {
      case 'upcoming':
        result = result
          .filter((e) => new Date(e.date.replace(/-/g, '/')) >= now)
          .sort(
            (a, b) =>
              new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/'))
          );
        break;
      case 'date-desc':
        result.sort(
          (a, b) =>
            new Date(b.date.replace(/-/g, '/')) - new Date(a.date.replace(/-/g, '/'))
        );
        break;
      case 'date-asc':
        result.sort(
          (a, b) =>
            new Date(a.date.replace(/-/g, '/')) - new Date(b.date.replace(/-/g, '/'))
        );
        break;
      case 'progress-desc':
        result.sort((a, b) => b.progress - a.progress);
        break;
      case 'progress-asc':
        result.sort((a, b) => a.progress - b.progress);
        break;
      case 'urgent-tasks': {
        const toDate = (d) => (d ? new Date(d) : new Date(8640000000000000)); // Infinity date
        result.sort((a, b) => toDate(a.next_task_due) - toDate(b.next_task_due));
        break;
      }
      default:
        break;
    }
    return result;
  }, [events, filter, sort, searchQuery]);

  const handleDeleteEvent = async (eventId, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción es irreversible.')) return;

    const { error } = await supabase.functions.invoke('delete-event', { body: { eventId } });
    if (error) {
      toast({ title: 'Error al eliminar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Evento eliminado' });
      // ✅ invalidar y refrescar lista
      queryClient.invalidateQueries({ queryKey: ['events', user.id] });
    }
  };

  if (profileLoading || eventsLoading) return <LoadingSpinner />;

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(/&|y/i).map((p) => p.trim());
    if (parts.length > 1) return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  return (
    <div className="min-h-screen bg-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* === Barra superior: identidad a la izquierda / acciones a la derecha === */}
          <ProfileHeaderBar
            profile={profile}
            greeting="Mira tus próximos eventos."
            onEdit={() => navigate('/profile/edit')}
            onChat={() => console.log('Abrir chat')}
          />

          {/* === Barra de navegación sticky === */}
          <ProfileTabsNav />
          <div className="mt-6" />   {/* 24px aprox */}

          {/* === Cabecera existente === */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1E1E1E]">Mis Eventos</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="dev-helper-switch"
                  checked={isDevHelperVisible}
                  onCheckedChange={setIsDevHelperVisible}
                />
                <Label htmlFor="dev-helper-switch" className="text-[#1E1E1E]">
                  Mostrar ruta
                </Label>
              </div>
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="border-[#DCD9D6] text-[#DCD9D6] hover:bg-[#F8F3F2]"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configuraciones
              </Button>
              <Button onClick={signOut} variant="destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              <div className="flex gap-2 flex-wrap w-full md:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por anfitrión..."
                    className="w-full p-2 pl-9 rounded-lg border border-gray-300 bg-white text-sm text-[#1E1E1E] focus:ring-2 focus:ring-[#9E7977]"
                  />
                </div>
                <Button
                  onClick={() => navigate('/wizard')}
                  className="bg-gradient-to-r from-[#B9A7F9] to-[#E8A4B8] text-white flex-shrink-0"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Crear Evento
                </Button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 bg-white text-sm text-[#1E1E1E] focus:ring-2 focus:ring-[#9E7977]"
              >
                <option value="all">Todos los tipos</option>
                {Object.entries(eventTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="p-2 rounded-lg border border-gray-300 bg-white text-sm text-[#1E1E1E] focus:ring-2 focus:ring-[#9E7977]"
              >
                <option value="upcoming">Próximos eventos</option>
                <option value="date-desc">Fecha (más reciente)</option>
                <option value="date-asc">Fecha (más antiguo)</option>
                <option value="progress-desc">Progreso (mayor)</option>
                <option value="progress-asc">Progreso (menor)</option>
                <option value="urgent-tasks">Tareas Urgentes</option>
              </select>
            </div>

            {filteredAndSortedEvents.length > 0 ? (
              <div className="space-y-6">
                {filteredAndSortedEvents.map((event) => {
                  const hosts = event.invitation_details?.hosts?.join(' y ');
                  const eventDate = new Date(event.date.replace(/-/g, '/'));
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      onClick={() => navigate(`/host/${event.id}`)}
                      className="bg-white rounded-2xl overflow-hidden border border-[#F8F3F2] hover:border-[#B9A7F9] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex"
                    >
                      <div className="w-1/3 relative">
                        {event.cover_image_url ? (
                          <img
                            src={event.cover_image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#B9A7F9]/20 to-[#E8A4B8]/20">
                            <div className="w-24 h-24 rounded-full border-2 border-white/50 flex items-center justify-center">
                              <span className="text-4xl font-bold text-white/80">
                                {getInitials(hosts || event.title)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-6 flex-grow flex flex-col justify-between w-2/3">
                        <div>
                          <div className="flex justify-between items-start">
                            <p className="text-sm font-semibold text-[#B9A7F9] mb-1">
                              {eventTypeLabels[event.event_type] || event.event_type_label || 'Evento'}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400 hover:bg-red-100 hover:text-red-600 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => handleDeleteEvent(event.id, e)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <h3 className="text-2xl font-bold text-[#1E1E1E] mb-2 truncate">
                            {hosts || event.title}
                          </h3>
                          <p className="text-[#5E5E5E] flex items-center gap-2 text-sm mb-2">
                            <Calendar className="w-4 h-4 text-[#B9A7F9]" />
                            {eventDate.toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-[#8C8C8C] flex items-center gap-1">
                              <Percent className="w-3 h-3" /> Avance
                            </span>
                            <span className="text-xs font-bold text-[#1E1E1E]">{event.progress}%</span>
                          </div>
                          <div className="w-full bg-[#F8F3F2] rounded-full h-2">
                            <motion.div
                              className="bg-gradient-to-r from-[#B9A7F9] to-[#E8A4B8] h-2 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${event.progress}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-[#DCD9D6]">
                <h3 className="text-2xl font-semibold text-[#1E1E1E]">No hay eventos que coincidan</h3>
                <p className="text-[#5E5E5E] mt-2 mb-6">Prueba a cambiar los filtros o crea un nuevo evento.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
