import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, Percent, Trash2, Sparkles, Search, Settings, LogOut,
  ListChecks, Building2, UserCog, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDevHelper } from '@/contexts/DevHelperContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/contexts/SupabaseAuthContext';

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
  text
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase() || '';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const { isDevHelperVisible, setIsDevHelperVisible } = useDevHelper();

  // Sidebar derecha (desplegable) — abierta por defecto
  const [isRightbarOpen, setIsRightbarOpen] = useState(true);

  const fetchProfileAndEvents = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('full_name, email, avatar_url, phone')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      setProfile(profileData);

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, title, date, cover_image_url, event_type, event_type_label, invitation_details,
          planner_tasks ( status, due_date )
        `)
        .eq('user_id', user.id);

      if (eventsError) throw eventsError;

      const eventsWithDetails = (eventsData || []).map((event) => {
        const tasks = event.planner_tasks || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t) => t.status === 'completed').length;
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        const toDate = (d) => (d ? new Date(d.replace?.(/-/g, '/') || d) : null);
        const upcomingTasks = tasks
          .filter((t) => t.status !== 'completed' && t.due_date)
          .sort((a, b) => toDate(a.due_date) - toDate(b.due_date));

        const next_task_due = upcomingTasks[0]?.due_date || null;
        return { ...event, progress, next_task_due };
      });

      setEvents(eventsWithDetails);
    } catch (error) {
      console.error('Error fetching profile and events:', error);
      toast({
        title: 'Error al cargar datos',
        description: 'No se pudo obtener la información. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileAndEvents();
  }, [fetchProfileAndEvents]);

  const filteredAndSortedEvents = useMemo(() => {
    let result = [...events];

    if (searchQuery) {
      const normalizedQuery = normalizeText(searchQuery);
      result = result.filter((event) => {
        const hosts = event.invitation_details?.hosts?.join(' ') || '';
        const title = event.title || '';
        return (
          normalizeText(hosts).includes(normalizedQuery) ||
          normalizeText(title).includes(normalizedQuery)
        );
      });
    }

    if (filter !== 'all') {
      result = result.filter((event) => event.event_type === filter);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const toDate = (d) => (d ? new Date(d.replace?.(/-/g, '/') || d) : new Date('9999-12-31'));

    switch (sort) {
      case 'upcoming':
        result = result
          .filter((e) => toDate(e.date) >= now)
          .sort((a, b) => toDate(a.date) - toDate(b.date));
        break;
      case 'date-desc':
        result.sort((a, b) => toDate(b.date) - toDate(a.date));
        break;
      case 'date-asc':
        result.sort((a, b) => toDate(a.date) - toDate(b.date));
        break;
      case 'progress-desc':
        result.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
        break;
      case 'progress-asc':
        result.sort((a, b) => (a.progress ?? 0) - (b.progress ?? 0));
        break;
      case 'urgent-tasks':
        result.sort((a, b) => toDate(a.next_task_due) - toDate(b.next_task_due));
        break;
      default:
        break;
    }
    return result;
  }, [events, filter, sort, searchQuery]);

  const handleDeleteEvent = async (eventId, e) => {
    e?.stopPropagation?.();
    if (
      !window.confirm('¿Estás seguro de que quieres eliminar este evento? Esta acción es irreversible.')
    )
      return;

    const { data, error } = await supabase.functions.invoke('delete-event', { body: { eventId } });
    if (error || data?.error) {
      toast({
        title: 'Error al eliminar',
        description: error?.message || data?.error,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Evento eliminado' });
      fetchProfileAndEvents();
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(/&|y/i).map((p) => p.trim());
    if (parts.length > 1) return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  if (loading) return <LoadingSpinner />;

  const NavBtn = ({ active, icon: Icon, label, to }) => (
    <button
      onClick={() => navigate(to)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition text-left 
        ${active ? 'bg-[#F8F3F2] text-[#1E1E1E]' : 'hover:bg-[#F8F3F2] text-[#1E1E1E]'}
      `}
    >
      <Icon className="w-4 h-4 text-[#9E7977]" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  const pathname = location.pathname;

  return (
    <div className="min-h-screen bg-[#FBF8F7]">
      {/* Contenedor principal con grid: contenido + sidebar derecha */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* CONTENIDO PRINCIPAL */}
          <div className={`col-span-12 ${isRightbarOpen ? 'lg:col-span-9' : 'lg:col-span-12'}`}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <h1 className="text-4xl md:text-5xl font-bold text-[#1E1E1E]">Mis Eventos</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch id="dev-helper-switch" checked={isDevHelperVisible} onCheckedChange={setIsDevHelperVisible} />
                    <Label htmlFor="dev-helper-switch" className="text-[#1E1E1E]">Mostrar ruta</Label>
                  </div>
                  <Button onClick={() => navigate('/settings')} variant="outline" className="border-[#DCD9D6] text-[#1E1E1E] hover:bg-[#F8F3F2]">
                    <Settings className="w-4 h-4 mr-2" /> Configuraciones
                  </Button>
                  <Button onClick={signOut} variant="destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                  </Button>
                </div>
              </div>

              {/* Controles */}
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
                  <Button onClick={() => navigate('/wizard')} className="bg-gradient-to-r from-[#B9A7F9] to-[#E8A4B8] text-white flex-shrink-0">
                    <Sparkles className="w-4 h-4 mr-2" /> Crear Evento
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

              {/* Lista de eventos */}
              {filteredAndSortedEvents.length > 0 ? (
                <div className="space-y-6">
                  {filteredAndSortedEvents.map((event) => {
                    const hosts = event.invitation_details?.hosts?.join(' y ');
                    const dateObj = event?.date ? new Date(event.date.replace?.(/-/g, '/') || event.date) : null;

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
                            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#B9A7F9]/20 to-[#E8A4B8]/20">
                              <div className="w-24 h-24 rounded-full border-2 border-white/50 flex items-center justify-center">
                                <span className="text-4xl font-bold text-white/80">{getInitials(hosts || event.title)}</span>
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

                            <h3 className="text-2xl font-bold text-[#1E1E1E] mb-2 truncate">{hosts || event.title}</h3>

                            <p className="text-[#5E5E5E] flex items-center gap-2 text-sm mb-2">
                              <Calendar className="w-4 h-4 text-[#B9A7F9]" />
                              {dateObj && dateObj.toString() !== 'Invalid Date'
                                ? dateObj.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                                : 'Fecha por definir'}
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
            </motion.div>
          </div>

          {/* SIDEBAR DERECHA — abierta por defecto, plegable */}
          <aside className={`col-span-12 lg:col-span-3 lg:static ${isRightbarOpen ? '' : 'lg:hidden'} `}>
            <div className="lg:sticky lg:top-6">
              <div className="bg-white border border-[#EEE9E7] rounded-2xl p-5 relative">
                {/* Botón plegar/expandir (desktop) */}
                <button
                  onClick={() => setIsRightbarOpen((v) => !v)}
                  className="hidden lg:flex absolute -left-3 top-6 w-6 h-6 rounded-full border border-[#EEE9E7] bg-white items-center justify-center shadow"
                  title={isRightbarOpen ? 'Ocultar panel' : 'Mostrar panel'}
                >
                  {isRightbarOpen ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
                </button>

                <h3 className="text-base font-semibold text-[#1E1E1E] mb-3">Panel</h3>
                <div className="grid grid-cols-1 gap-2">
                  <NavBtn icon={Calendar} label="Eventos" to="/profile" active={pathname.startsWith('/profile')} />
                  <NavBtn icon={ListChecks} label="Pendientes" to="/pendientes" active={pathname.startsWith('/pendientes')} />
                  <NavBtn icon={Building2} label="Proveedores" to="/proveedores" active={pathname.startsWith('/proveedores')} />
                  <NavBtn icon={UserCog} label="Mi cuenta" to="/account" active={pathname.startsWith('/account')} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Botón flotante para mostrar/ocultar sidebar en móviles */}
      <button
        onClick={() => setIsRightbarOpen((v) => !v)}
        className="lg:hidden fixed bottom-6 right-6 z-30 bg-white border border-[#EEE9E7] shadow rounded-full p-3"
        title={isRightbarOpen ? 'Ocultar panel' : 'Mostrar panel'}
      >
        {isRightbarOpen ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
      </button>
    </div>
  );
}
