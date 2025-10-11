import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Settings, Eye, Download, Users, Camera, MessageSquare, BarChart3, Copy, ExternalLink, ClipboardCheck, User as UserIcon, ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// === Utilidades para portada (referencia ProfilePage) ===
const EVENT_TYPE_LABELS = {
  boda: 'Boda',
  quince: 'Quince Años',
  cumpleanos: 'Cumpleaños',
  corporativo: 'Corporativo',
  babyshower: 'Baby Shower',
  aniversario: 'Aniversario',
  otro: 'Otro Evento',
};
const startOfDay = (d) => { const nd = new Date(d); nd.setHours(0, 0, 0, 0); return nd; };
const daysUntil = (dateStr) => { if (!dateStr) return null; const today = startOfDay(new Date()); const eventDate = startOfDay(new Date(String(dateStr).replace(/-/g, '/'))); return Math.floor((eventDate - today) / 86400000); };
const formatLongEsDate = (d) => {
  if (!d) return '';
  const date = new Date(String(d).replace(/-/g, '/'));
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
};
const getInitials = (name) => {
  if (!name) return '?';
  const parts = String(name).split(/&|y/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase();
  return name[0].toUpperCase();
};

const HostDashboard = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({
    totalUploads: 0,
    uniqueGuests: 0,
    totalMessages: 0,
    storageUsed: 0,
    totalRsvps: 0,
  });
  const [loading, setLoading] = useState(true);

  // --- NUEVO: resumen compacto del Planner para evitar duplicidades ---
  const [plannerSummary, setPlannerSummary] = useState({
    pendingTasks: 0,
    nextItem: null,
    estimatedTotal: 0,
    actualTotal: 0,
  });

  const fetchPlannerSummary = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      const [{ count: pendingTasks }, { data: nextItems }, { data: budgetData }] = await Promise.all([
        supabase.from('planner_tasks').select('*', { head: true, count: 'exact' }).eq('event_id', eventId).neq('status', 'completed'),
        supabase.from('planner_timeline_items').select('id,title,start_ts').eq('event_id', eventId).gt('start_ts', nowIso).order('start_ts', { ascending: true }).limit(1),
        supabase.from('planner_budget_items').select('estimated_cost, actual_cost').eq('event_id', eventId),
      ]);
      const estimatedTotal = (budgetData || []).reduce((sum, it) => sum + Number(it.estimated_cost || 0), 0);
      const actualTotal = (budgetData || []).reduce((sum, it) => sum + Number(it.actual_cost || 0), 0);
      setPlannerSummary({
        pendingTasks: pendingTasks || 0,
        nextItem: (nextItems && nextItems[0]) || null,
        estimatedTotal,
        actualTotal,
      });
    } catch (e) {
      console.error('Planner summary error', e);
    }
  }, [eventId]);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (eventError) throw eventError;

      if (!eventData) {
        toast({ title: 'Evento no encontrado', variant: 'destructive' });
        navigate('/');
        return;
      }
      setEvent(eventData);

      const [
        { count: totalUploads, data: uploadsData },
        { count: totalMessages },
        { count: totalRsvps },
        { data: guestData }
      ] = await Promise.all([
        supabase.from('uploads').select('guest_name, file_size', { count: 'exact' }).eq('event_id', eventId),
        supabase.from('guestbook_messages').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('invitation_id', eventId),
        supabase.rpc('get_unique_guests_count', { p_event_id: eventId })
      ]);

      const uniqueGuests = (guestData && guestData[0] && guestData[0].count) || 0;
      const storageUsed = (uploadsData || []).reduce((sum, u) => sum + (Number(u.file_size || 0) / (1024 * 1024)), 0).toFixed(2);

      setStats({ totalUploads: totalUploads || 0, uniqueGuests, totalMessages: totalMessages || 0, storageUsed, totalRsvps: totalRsvps || 0 });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  // Dispara el resumen de Planner (usa start_ts para el próximo hito)
  useEffect(() => {
    fetchPlannerSummary();
  }, [fetchPlannerSummary]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[#5E5E5E]">Cargando…</div>
      </div>
    );
  }

  if (!event) return null;

  const invitationLink = `${window.location.origin}/invitation/${eventId}`;
  const galleryLink = `${window.location.origin}/event/${eventId}/gallery`;
  const uploadLink = `${window.location.origin}/event/${eventId}/upload`;
  const tablesLink = `${window.location.origin}/event/${eventId}/find-table`;

  const downloadQR = (link, filename, iconType) => {
    const iconUrlMap = {
      invitation: 'https://cdn-icons-png.flaticon.com/512/1041/1041888.png',
      gallery: 'https://cdn-icons-png.flaticon.com/512/1375/1375106.png',
      tables: 'https://cdn-icons-png.flaticon.com/512/3448/3448618.png'
    };
    const iconUrl = iconUrlMap[iconType] || '';
    const qrAPI = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(link)}&margin=0&format=png&color=2D2D2D&bgcolor=FFFFFF&logourl=${encodeURIComponent(iconUrl)}&logo-size-percent=0.2`;

    fetch(qrAPI)
      .then(response => response.blob())
      .then(blob => {
        saveAs(blob, filename);
        toast({ title: "Descargando QR", description: "La descarga iniciará en breve." });
      })
      .catch(() => toast({ title: 'No fue posible descargar el QR', variant: 'destructive' }));
  };

  const copyLink = (linkToCopy) => {
    navigator.clipboard.writeText(linkToCopy);
    toast({ title: '¡Enlace copiado!' });
  };

  // === Derivados para portada compacta (no modifica lógicas) ===
  const hosts = Array.isArray(event?.invitation_details?.hosts) && event.invitation_details.hosts.length
    ? event.invitation_details.hosts.join(' y ')
    : (event?.title || '');
  const typeLabel = EVENT_TYPE_LABELS[event?.event_type] || event?.event_type_label || 'Evento';
  const until = daysUntil(event?.date);

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header (con back a la izquierda, mantiene títulos, quita "Salir") */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <Button variant="ghost" onClick={() => navigate(-1)} className="text-[#2D2D2D] hover:bg-[#F5F5F5]">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-extrabold text-[#2D2D2D]">Dashboard del Evento</h1>
              <p className="text-[#5E5E5E]">Bienvenido, aquí gestionas tu evento y accedes al Planner.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/host/${eventId}/settings`)} className="border-[#E6E3E0] text-[#2D2D2D] hover:bg-[#F8F8F8]">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Portada compacta (blanca) */}
        <div className="bg-white rounded-2xl overflow-hidden border border-[#E6ECEF] mb-6">
          <div className="flex items-center p-4 md:p-5 gap-4">
            {/* Mini cover */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border border-[#E6ECEF] bg-gradient-to-br from-[#DDE9F3] to-[#E9F6F0] flex items-center justify-center">
              {event?.cover_image_url ? (
                <img src={event.cover_image_url} alt={hosts} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-slate-700 leading-none text-center text-[clamp(18px,3.6vw,28px)]">{getInitials(hosts)}</span>
              )}
            </div>

            {/* Texto principal */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="text-xl md:text-2xl font-semibold text-[#1E1E1E] truncate max-w-[70vw] md:max-w-[40rem]">
                  {hosts}
                </div>
                <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  {typeLabel}
                </span>
                {typeof until === 'number' && (
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                    {until < 0 ? 'Evento pasado' : until === 0 ? 'Hoy' : until === 1 ? 'Falta 1 día' : `Faltan ${until} días`}
                  </span>
                )}
              </div>
              <p className="text-[#5E5E5E] flex items-center gap-2 text-sm mt-1">
                <Calendar className="w-4 h-4 text-[#8ABBD6]" />
                {formatLongEsDate(event?.date)}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users />} title="Invitados únicos" value={stats.uniqueGuests} color="lila" />
          <StatCard icon={<Camera />} title="Subidas" value={stats.totalUploads} color="azul" />
          <StatCard icon={<MessageSquare />} title="Mensajes" value={stats.totalMessages} color="verde" />
          <StatCard icon={<BarChart3 />} title="Almacenamiento" value={`${stats.storageUsed} MB`} color="gris" />
        </div>

        {/* Centro de mando del Planner – ahora sin duplicar todos los módulos */}
        <div className="bg-white rounded-2xl p-6 border border-[#E6E3E0] mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#2D2D2D] mb-4 flex items-center"><ClipboardCheck className="w-6 h-6 mr-3 text-[#B9A7F9]" />Centro de Mando del Planner</h2>

          <div className="grid gap-4">
            {/* Resumen compacto */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-[#F9F8F7] rounded-xl p-4 border border-[#E6E3E0]">
                <div className="text-xs text-[#5E5E5E]">Próximo hito</div>
                <div className="text-sm font-medium text-[#2D2D2D]">
                  {plannerSummary.nextItem ? plannerSummary.nextItem.title : '—'}
                </div>
                <div className="text-xs text-[#5E5E5E]">
                  {plannerSummary.nextItem ? new Date(plannerSummary.nextItem.start_ts).toLocaleString() : ''}
                </div>
              </div>
              <div className="bg-[#F9F8F7] rounded-xl p-4 border border-[#E6E3E0]">
                <div className="text-xs text-[#5E5E5E]">Tareas pendientes</div>
                <div className="text-2xl font-bold text-[#2D2D2D]">{plannerSummary.pendingTasks}</div>
                <div className="text-xs text-[#5E5E5E]">en el plan</div>
              </div>
              <div className="bg-[#F9F8F7] rounded-xl p-4 border border-[#E6E3E0]">
                <div className="text-xs text-[#5E5E5E]">Presupuesto</div>
                <div className="text-sm font-medium text-[#2D2D2D]">
                  {'$'}{plannerSummary.actualTotal.toLocaleString()} / {'$'}{plannerSummary.estimatedTotal.toLocaleString()}
                </div>
                <div className="text-xs text-[#5E5E5E]">gastado / estimado</div>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <PlannerButton
                label="Tareas y Checklist"
                desc="Organiza pendientes y responsables"
                onClick={() => navigate(`/host/${eventId}/planner/tasks`)}
              />
              <PlannerButton
                label="Cronograma"
                desc="Hitos y línea de tiempo del evento"
                onClick={() => navigate(`/host/${eventId}/planner/timeline`)}
              />
              <PlannerButton
                label="Presupuesto y Pagos"
                desc="Costos, pagos y calendario"
                onClick={() => navigate(`/host/${eventId}/planner/budget`)}
              />
              <PlannerButton
                label="Ver todos los módulos"
                desc="Abrir Planner completo"
                onClick={() => navigate(`/host/${eventId}/planner`)}
              />
            </div>
          </div>
        </div>

        {/* Acciones rápidas del evento */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ActionCard icon={<QrCode />} title="Invitación">
            <Button onClick={() => downloadQR(invitationLink, 'invitation-qr.png', 'invitation')} className="w-full mb-2"><Download className="w-4 h-4 mr-2" />Descargar QR</Button>
            <Button onClick={() => copyLink(invitationLink)} variant="outline" className="w-full border-[#E6E3E0]"><Copy className="w-4 h-4 mr-2" />Copiar enlace</Button>
            <LinkRow label="Ver invitación" link={invitationLink} />
          </ActionCard>

          <ActionCard icon={<Eye />} title="Galería">
            {/* QR y enlace apuntan a la LANDING DE SUBIDA */}
            <Button
              onClick={() => downloadQR(uploadLink, 'upload-qr.png', 'gallery')}
              className="w-full mb-2"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar QR
            </Button>

            <Button
              onClick={() => copyLink(uploadLink)}
              variant="outline"
              className="w-full border-[#E6E3E0]"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar enlace
            </Button>

            {/* Enlace visible a la landing de subida */}
            <LinkRow label="Página para subir fotos" link={uploadLink} />

            {/* Enlace secundario al álbum (por si el host quiere abrir el álbum) */}
            <LinkRow label="Ver galería" link={galleryLink} />
          </ActionCard>


          <ActionCard icon={<Users />} title="Mesas">
            <Button onClick={() => downloadQR(tablesLink, 'tables-qr.png', 'tables')} className="w-full mb-2"><Download className="w-4 h-4 mr-2" />Descargar QR</Button>
            <Button onClick={() => copyLink(tablesLink)} variant="outline" className="w-full border-[#E6E3E0]"><Copy className="w-4 h-4 mr-2" />Copiar enlace</Button>
            <LinkRow label="Buscar mesa" link={tablesLink} />
          </ActionCard>
        </div>

        {/* Navegación a secciones de gestión */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          <ActionCard icon={<Camera />} title="Moderación">
            <Button onClick={() => navigate(`/host/${eventId}/moderation`)} className="w-full">Abrir Moderación</Button>
          </ActionCard>
          <ActionCard icon={<Users />} title="Invitados y Mesas">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => navigate(`/host/${eventId}/guests`)} className="w-full">Invitados</Button>
              <Button onClick={() => navigate(`/host/${eventId}/tables`)} className="w-full">Mesas</Button>
            </div>
          </ActionCard>
          <ActionCard icon={<MessageSquare />} title="RSVPs">
            <Button onClick={() => navigate(`/host/${eventId}/rsvps`)} className="w-full">Gestionar RSVPs</Button>
          </ActionCard>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------
// UI Helpers (se mantienen)
// -------------------------------------------------------
const StatCard = ({ icon, title, value, color }) => {
  const colorMap = {
    lila: 'bg-[#B9A7F9]/10 text-[#6B5CC8] border-[#B9A7F9]/30',
    azul: 'bg-[#A7C1F9]/10 text-[#3B6CCC] border-[#A7C1F9]/40',
    verde: 'bg-[#A7F9C2]/10 text-[#2E7D32] border-[#A7F9C2]/40',
    gris: 'bg-[#E6E3E0]/20 text-[#2D2D2D] border-[#E6E3E0]/60',
  };
  return (
    <div className={`rounded-2xl p-5 border ${colorMap[color] || ''}`}>
      <div className="flex items-center gap-3 text-sm font-medium">
        {React.cloneElement(icon, { className: 'w-4 h-4' })}
        {title}
      </div>
      <div className="text-2xl font-extrabold mt-1">{value}</div>
    </div>
  );
};

const ActionCard = ({ icon, title, children, className = '' }) => (
  <div className={`bg-white rounded-2xl p-6 border border-[#E6E3E0] shadow-sm ${className}`}>
    <h3 className="text-xl font-semibold text-[#2D2D2D] mb-4 flex items-center">{React.cloneElement(icon, { className: 'w-5 h-5 mr-2 text-[#B9A7F9]' })}{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const PlannerButton = ({ label, desc, onClick }) => (
  <Button
    onClick={onClick}
    variant="outline"
    className="border-[#B9A7F9]/40 text-[#2D2D2D] hover:bg-[#B9A7F9]/10 justify-start p-4 h-auto text-left"
  >
    <div className="flex flex-col">
      <span>{label}</span>
      <span className="text-xs font-normal text-[#5E5E5E]">{desc}</span>
    </div>
  </Button>
);

const LinkRow = ({ label, link }) => (
  <div className="flex items-center gap-3 bg-[#F9F8F7] rounded-xl p-3 border border-[#E6E3E0]">
    <span className="text-[#5E5E5E] text-sm shrink-0">{label}</span>
    <code className="flex-1 text-[#B9A7F9] text-sm break-all">{link}</code>
    <Button onClick={() => navigator.clipboard.writeText(link)} size="sm" variant="outline" className="border-[#E6E3E0] hover:bg-[#E6E3E0] shrink-0"><Copy className="w-4 h-4" /></Button>
    <Button onClick={() => window.open(link, '_blank')} size="sm" variant="outline" className="border-[#E6E3E0] hover:bg-[#E6E3E0] shrink-0"><ExternalLink className="w-4 h-4" /></Button>
  </div>
);

export default HostDashboard;