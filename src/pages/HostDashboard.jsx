
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { QrCode, Settings, Eye, Download, Users, Camera, MessageSquare, Play, BarChart3, Share2, Copy, ExternalLink, Table, UserPlus, Edit, ClipboardCheck, User as UserIcon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useAuth } from '@/contexts/SupabaseAuthContext';

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

  const fetchEventData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        toast({
          title: "Error",
          description: "No se pudo cargar el evento o no tienes permiso.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      setEvent(eventData);

      const [
        { count: totalUploads, data: uploadsData },
        { count: totalMessages },
        { count: totalRsvps },
        { data: guestData, error: guestError }
      ] = await Promise.all([
        supabase.from('uploads').select('guest_name, file_size', { count: 'exact' }).eq('event_id', eventId),
        supabase.from('guestbook_messages').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('rsvps').select('*', { count: 'exact', head: true }).eq('invitation_id', eventId),
        supabase.rpc('get_unique_guests_count', { p_event_id: eventId })
      ]);

      const totalSize = uploadsData.reduce((acc, file) => acc + (file.file_size || 0), 0);

      setStats({
        totalUploads: totalUploads || 0,
        uniqueGuests: guestError ? 0 : guestData,
        totalMessages: totalMessages || 0,
        storageUsed: (totalSize / (1024 * 1024)).toFixed(2),
        totalRsvps: totalRsvps || 0,
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast({ title: 'Error al cargar datos', description: 'No se pudo obtener toda la información.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const invitationLink = `${window.location.origin}/invitation/${eventId}`;
  const galleryUploadLink = `${window.location.origin}/event/${eventId}/upload`;
  const findTableLink = `${window.location.origin}/event/${eventId}/find-table`;

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast({ title: "¡Enlace copiado!", description: "El enlace se copió al portapapeles" });
  };

  const downloadQR = (link, filename, iconType) => {
    const iconUrlMap = {
      invitation: 'https://cdn-icons-png.flaticon.com/512/1041/1041888.png',
      gallery: 'https://cdn-icons-png.flaticon.com/512/1375/1375106.png',
      tables: 'https://cdn-icons-png.flaticon.com/512/3448/3448618.png'
    };
    const iconUrl = iconUrlMap[iconType] || '';
    const qrAPI = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(link)}&ecc=H&margin=20&format=png&logourl=${encodeURIComponent(iconUrl)}&logo-size-percent=0.2`;

    fetch(qrAPI)
      .then(response => response.blob())
      .then(blob => {
        saveAs(blob, filename);
        toast({ title: "Descargando QR", description: "La descarga de tu código QR ha comenzado." });
      })
      .catch(() => {
        toast({ title: "Error al descargar QR", variant: "destructive" });
      });
  };

  const downloadZip = async () => {
    toast({ title: "Preparando descarga...", description: "Esto puede tardar unos minutos." });
    const zip = new JSZip();

    const { data: uploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('file_url, guest_name, file_name')
      .eq('event_id', eventId);

    if (uploadsError) {
      toast({ title: "Error", description: "No se pudieron obtener los archivos.", variant: "destructive" });
      return;
    }

    for (const upload of uploads) {
      try {
        const response = await fetch(upload.file_url);
        const blob = await response.blob();
        zip.folder(upload.guest_name).file(upload.file_name, blob);
      } catch (e) {
        console.error(`Failed to fetch ${upload.file_url}`, e);
      }
    }

    const { data: messages, error: messagesError } = await supabase
      .from('guestbook_messages')
      .select('guest_name, content, created_at')
      .eq('event_id', eventId);

    if (!messagesError && messages.length > 0) {
      let csvContent = "Invitado,Mensaje,Fecha\n";
      messages.forEach(msg => {
        csvContent += `"${msg.guest_name}","${msg.content.replace(/"/g, '""')}","${new Date(msg.created_at).toLocaleString()}"\n`;
      });
      zip.file("libro_de_visitas.csv", csvContent);
    }

    zip.generateAsync({ type: "blob" }).then(content => {
      saveAs(content, `mitus-evento-${eventId}.zip`);
      toast({ title: "¡Descarga completa!", description: "Tu archivo ZIP está listo." });
    });
  };

  const handleEditEvent = () => {
    const wizardData = {
      eventType: event.event_type,
      eventName: event.title,
      eventDate: event.date,
      ...event.invitation_details
    };
    localStorage.setItem('wizardFormData', JSON.stringify(wizardData));
    if (event.cover_image_url) {
      sessionStorage.setItem('wizardImagePreview', event.cover_image_url);
    }
    navigate(`/wizard?step=1&edit=${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F7]">
        <div className="text-[#2D2D2D] text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B9A7F9] mx-auto mb-4"></div>
          <p>Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  const hosts = event.invitation_details?.hosts?.join(' y ');

  return (
    <div className="min-h-screen py-8 px-4 bg-[#F9F8F7]">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

          <div className="bg-white rounded-2xl p-6 border border-[#E6E3E0] mb-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="mb-4 lg:mb-0">
                <h1 className="text-3xl font-bold text-[#2D2D2D] mb-2">{event.title}</h1>
                {hosts && <p className="text-lg text-[#B9A7F9] mb-2">{hosts}</p>}
                <p className="text-[#5E5E5E]">Código: <span className="font-mono bg-[#B9A7F9]/20 px-2 py-1 rounded">{eventId}</span></p>
                <p className="text-[#5E5E5E]">{new Date(event.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate('/profile')} className="bg-[#2D2D2D] text-white hover:bg-[#5E5E5E]"><UserIcon className="w-4 h-4 mr-2" />Mi Perfil</Button>
                <Button onClick={() => navigate(`/invitation/${eventId}`)} className="bg-[#2D2D2D] text-white hover:bg-[#5E5E5E]"><Eye className="w-4 h-4 mr-2" />Ver Evento</Button>
                <Button onClick={handleEditEvent} className="bg-[#2D2D2D] text-white hover:bg-[#5E5E5E]"><Edit className="w-4 h-4 mr-2" />Editar Evento</Button>
                <Button onClick={() => navigate(`/host/${eventId}/settings`)} className="bg-[#2D2D2D] text-white hover:bg-[#5E5E5E]"><Settings className="w-4 h-4 mr-2" />Configuración</Button>
                <Button onClick={signOut} variant="destructive"><LogOut className="w-4 h-4 mr-2" />Cerrar Sesión</Button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatCard icon={<Users />} title="RSVP" value={stats.totalRsvps} color="lavanda" onClick={() => navigate(`/host/${eventId}/rsvps`)} />
            <StatCard icon={<Camera />} title="Total Subidas" value={stats.totalUploads} color="rosa" />
            <StatCard icon={<Users />} title="Invitados Únicos" value={stats.uniqueGuests} color="azul" />
            <StatCard icon={<MessageSquare />} title="Mensajes" value={stats.totalMessages} color="verde" />
            <StatCard icon={<BarChart3 />} title="Almacenamiento" value={`${stats.storageUsed} MB`} color="gris" />
          </div>

          <div className="bg-white rounded-2xl p-6 border border-[#E6E3E0] mb-8 shadow-sm">
            <h2 className="text-2xl font-bold text-[#2D2D2D] mb-4 flex items-center"><ClipboardCheck className="w-6 h-6 mr-3 text-[#B9A7F9]" />Centro de Mando del Planner</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <PlannerButton label="Dashboard del Planner" desc="Vista general de tu planificación" onClick={() => navigate(`/host/${eventId}/planner`)} />
              <PlannerButton label="Tareas y Checklist" desc="Organiza todas las tareas" onClick={() => navigate(`/host/${eventId}/planner/tasks`)} />
              <PlannerButton label="Cronograma" desc="El minuto a minuto del evento" onClick={() => navigate(`/host/${eventId}/planner/timeline`)} />
              <PlannerButton label="Proveedores" desc="Gestiona tus contactos" onClick={() => navigate(`/host/${eventId}/planner/providers`)} />
              <PlannerButton label="Presupuesto y Pagos" desc="Controla tus finanzas" onClick={() => navigate(`/host/${eventId}/planner/budget`)} />
              <PlannerButton label="Documentos" desc="Guarda contratos y más" onClick={() => navigate(`/host/${eventId}/planner/documents`)} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ActionCard icon={<QrCode />} title="Invitación">
              <Button onClick={() => downloadQR(invitationLink, `qr-invitacion-${eventId}.png`, 'invitation')} className="w-full bg-gradient-to-r from-[#B9A7F9] to-[#E8A4B8] text-white"><Download className="w-4 h-4 mr-2" />Descargar QR</Button>
              <Button onClick={() => copyLink(invitationLink)} variant="outline" className="w-full border-[#C7C3BF] text-[#2D2D2D] hover:bg-[#E6E3E0]"><Copy className="w-4 h-4 mr-2" />Copiar Enlace</Button>
              <Button onClick={() => window.open(`https://wa.me/?text=¡Estás invitado! ${invitationLink}`, '_blank')} variant="outline" className="w-full border-[#E8A4B8]/40 text-[#E8A4B8] hover:bg-[#E8A4B8]/10"><Share2 className="w-4 h-4 mr-2" />Compartir WhatsApp</Button>
            </ActionCard>

            <ActionCard icon={<Camera />} title="Galería">
              <Button onClick={() => navigate(`/event/${eventId}/gallery`)} className="w-full bg-gradient-to-r from-[#AFC7D8] to-[#B9A7F9] text-white"><Eye className="w-4 h-4 mr-2" />Ver Galería</Button>
              <Button onClick={() => downloadQR(galleryUploadLink, `qr-galeria-${eventId}.png`, 'gallery')} variant="outline" className="w-full border-[#C7C3BF] text-[#2D2D2D] hover:bg-[#E6E3E0]"><Download className="w-4 h-4 mr-2" />Descargar QR de Subida</Button>
              <Button onClick={() => window.open(`https://wa.me/?text=Sube tus fotos y videos del evento aquí: ${galleryUploadLink}`, '_blank')} variant="outline" className="w-full border-[#E8A4B8]/40 text-[#E8A4B8] hover:bg-[#E8A4B8]/10"><Share2 className="w-4 h-4 mr-2" />Compartir Enlace</Button>
            </ActionCard>

            <ActionCard icon={<Settings />} title="Administración">
              <Button onClick={() => navigate(`/host/${eventId}/moderation`)} className="w-full bg-gradient-to-r from-[#E8A4B8] to-[#B9A7F9] text-white"><Settings className="w-4 h-4 mr-2" />Moderación</Button>
              <Button onClick={() => navigate(`/event/${eventId}/slideshow`)} variant="outline" className="w-full border-[#C7C3BF] text-[#2D2D2D] hover:bg-[#E6E3E0]"><Play className="w-4 h-4 mr-2" />Slideshow</Button>
              <Button onClick={downloadZip} variant="outline" className="w-full border-[#B9A7F9]/40 text-[#B9A7F9] hover:bg-[#B9A7F9]/10"><Download className="w-4 h-4 mr-2" />Descargar Todo (ZIP)</Button>
            </ActionCard>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <ActionCard icon={<UserPlus />} title="Invitados">
              <Button onClick={() => navigate(`/host/${eventId}/guests`)} className="w-full bg-gradient-to-r from-[#B9A7F9] to-[#AFC7D8] text-white"><Users className="w-4 h-4 mr-2" />Ver Invitados</Button>
            </ActionCard>
            <ActionCard icon={<Table />} title="Mesas">
              <Button onClick={() => navigate(`/host/${eventId}/tables`)} className="w-full bg-gradient-to-r from-[#E8A4B8] to-[#B9A7F9] text-white"><Table className="w-4 h-4 mr-2" />Ver Mesas</Button>
              <Button onClick={() => downloadQR(findTableLink, `qr-mesas-${eventId}.png`, 'tables')} variant="outline" className="w-full border-[#C7C3BF] text-[#2D2D2D] hover:bg-[#E6E3E0]"><Download className="w-4 h-4 mr-2" />Descargar QR de Mesas</Button>
            </ActionCard>
          </div>

          <div className="mt-8 bg-white rounded-2xl p-6 border border-[#E6E3E0] shadow-sm">
            <h3 className="text-lg font-semibold text-[#2D2D2D] mb-3">Enlaces Rápidos</h3>
            <div className="space-y-4">
              <LinkBox label="Invitación:" link={invitationLink} />
              <LinkBox label="Subir a Galería:" link={galleryUploadLink} />
              <LinkBox label="Buscar Mesa:" link={findTableLink} />
            </div>
          </div>

        </motion.div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value, color, onClick }) => {
  const palette = {
    lavanda: 'bg-gradient-to-br from-[#B9A7F9]/20 to-[#B9A7F9]/10 text-[#B9A7F9]',
    rosa: 'bg-gradient-to-br from-[#E8A4B8]/20 to-[#E8A4B8]/10 text-[#E8A4B8]',
    azul: 'bg-gradient-to-br from-[#AFC7D8]/20 to-[#AFC7D8]/10 text-[#AFC7D8]',
    verde: 'bg-gradient-to-br from-[#A3D9A5]/20 to-[#A3D9A5]/10 text-[#6BAF6E]',
    gris: 'bg-gradient-to-br from-[#E6E3E0]/40 to-[#F9F8F7]/20 text-[#5E5E5E]',
  };
  return (
    <div
      className={`${palette[color]} backdrop-blur-sm rounded-2xl p-6 border border-[#E6E3E0] ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#5E5E5E]">{title}</p>
          <p className="text-3xl font-bold text-[#2D2D2D]">{value}</p>
        </div>
        {React.cloneElement(icon, { className: "w-8 h-8" })}
      </div>
    </div>
  );
};

const ActionCard = ({ icon, title, children, className }) => (
  <div className={`bg-white rounded-2xl p-6 border border-[#E6E3E0] shadow-sm ${className}`}>
    <h3 className="text-xl font-semibold text-[#2D2D2D] mb-4 flex items-center">{React.cloneElement(icon, { className: "w-5 h-5 mr-2 text-[#B9A7F9]" })}{title}</h3>
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

const LinkBox = ({ label, link }) => {
  const copyLink = (linkToCopy) => {
    navigator.clipboard.writeText(linkToCopy);
    toast({ title: "¡Enlace copiado!" });
  };
  return (
    <div className="flex items-center gap-3 bg-[#F9F8F7] rounded-xl p-3 border border-[#E6E3E0]">
      <span className="text-[#5E5E5E] text-sm shrink-0">{label}</span>
      <code className="flex-1 text-[#B9A7F9] text-sm break-all">{link}</code>
      <Button onClick={() => copyLink(link)} size="sm" variant="ghost" className="text-[#2D2D2D] hover:bg-[#E6E3E0] shrink-0"><Copy className="w-4 h-4" /></Button>
      <Button onClick={() => window.open(link, '_blank')} size="sm" variant="ghost" className="text-[#2D2D2D] hover:bg-[#E6E3E0] shrink-0"><ExternalLink className="w-4 h-4" /></Button>
    </div>
  );
};

export default HostDashboard;