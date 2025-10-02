
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Camera, Users, MessageSquare, Calendar, MapPin, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const EventLanding = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState({ uploads: 0, guests: 0, messages: 0 });
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);

  const queryParams = new URLSearchParams(location.search);
  const actionParam = queryParams.get('action');

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(/&|y/i).map(p => p.trim());
    if (parts.length > 1) {
      return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, location, description, cover_image_url, settings, invitation_details')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        toast({
          title: "Evento no encontrado",
          description: "El evento que buscas no existe o ha expirado",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      setEvent(data);

      const [
        { count: uploadsCount },
        { count: messagesCount },
        { data: guestData, error: guestError }
      ] = await Promise.all([
        supabase.from('uploads').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('guestbook_messages').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.rpc('get_unique_guests_count', { p_event_id: eventId })
      ]);

      setStats({
        uploads: uploadsCount || 0,
        guests: guestError ? 0 : guestData,
        messages: messagesCount || 0,
      });

    } catch (error) {
      console.error('Error fetching event data:', error);
      toast({ title: 'Error al cargar datos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => {
    fetchEventData();
    const storedGuestName = sessionStorage.getItem('guestName');
    if (storedGuestName) {
      setGuestName(storedGuestName);
      if (actionParam) {
        navigate(`/event/${eventId}/${actionParam}`, { replace: true });
      }
    }
  }, [fetchEventData, eventId, navigate, actionParam]);

  const handleGuestAccess = (action) => {
    if (!guestName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor ingresa tu nombre para continuar",
        variant: "destructive"
      });
      return;
    }

    sessionStorage.setItem('guestName', guestName.trim());
    navigate(`/event/${eventId}/${action}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando evento...</p>
        </div>
      </div>
    );
  }
  
  const hosts = event.invitation_details?.hosts?.join(' y ');
  const eventDate = new Date(event.date.replace(/-/g, '/'));
  const location_fallback = event.location || event.invitation_details?.locations?.[0]?.address;
  const defaultAction = actionParam || 'upload';

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <div className="relative mb-8">
            <div className="aspect-video bg-gradient-to-br from-purple-600/30 to-blue-600/30 rounded-2xl border border-white/20 overflow-hidden">
              {event.cover_image_url ? (
                <img 
                  className="w-full h-full object-cover"
                  alt="Portada del evento"
                  src={event.cover_image_url} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#B9A7F9]/20 to-[#E8A4B8]/20">
                  <div className="w-24 h-24 rounded-full border-2 border-white/50 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white/80">{getInitials(hosts || event.title)}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2 rounded-full border-4 border-purple-900">
                <span className="text-white font-semibold">¡Únete al evento!</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-8">
            {hosts && (
              <h2 className="text-2xl text-purple-300 font-serif mb-2">{hosts}</h2>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {event.title}
            </h1>
            
            <div className="space-y-2 text-gray-300 mb-6">
              <div className="flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2 text-purple-300" />
                <span>{eventDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC'
                })}</span>
              </div>
              
              {location_fallback && (
                <div className="flex items-center justify-center">
                  <MapPin className="w-5 h-5 mr-2 text-blue-300" />
                  <span>{location_fallback}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-gray-200 leading-relaxed mb-6">
                {event.description}
              </p>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-200 mb-3">
                Para continuar, ingresa tu nombre:
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center"
                onKeyPress={(e) => e.key === 'Enter' && handleGuestAccess(defaultAction)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleGuestAccess('upload')}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Subir Fotos y Videos
            </Button>

            <Button
              onClick={() => handleGuestAccess('guestbook')}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10 py-4 text-lg rounded-xl backdrop-blur-sm"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Dejar Mensaje
            </Button>

            {event.settings?.allowGalleryView && (
              <Button
                onClick={() => handleGuestAccess('gallery')}
                variant="outline"
                className="w-full border-white/30 text-white hover:bg-white/10 py-4 text-lg rounded-xl backdrop-blur-sm"
              >
                <Eye className="w-5 h-5 mr-2" />
                Ver Galería
              </Button>
            )}
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white">{stats.uploads}</div>
              <div className="text-sm text-gray-300">Fotos</div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white">{stats.guests}</div>
              <div className="text-sm text-gray-300">Invitados</div>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white">{stats.messages}</div>
              <div className="text-sm text-gray-300">Mensajes</div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventLanding;
