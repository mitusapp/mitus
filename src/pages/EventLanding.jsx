// src/pages/EventLanding.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Camera, MessageSquare, Calendar, MapPin, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const EventLanding = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);

  const queryParams = new URLSearchParams(location.search);
  const actionParam = queryParams.get('action');

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(/&|y/i).map((p) => p.trim());
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
          title: 'Evento no encontrado',
          description: 'El evento que buscas no existe o ha expirado',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }
      setEvent(data);
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
  }
  // ❌ sin redirección aquí: siempre se queda en la landing
}, [fetchEventData]);


  const handleGuestAccess = (action) => {
    // Nombre opcional → solo guardar si el usuario lo escribió
    if (guestName.trim()) {
      sessionStorage.setItem('guestName', guestName.trim());
    }
    navigate(`/event/${eventId}/${action}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto mb-4"></div>
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
    <div className="min-h-screen py-10 px-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Imagen de portada */}
          <div className="relative mb-10">
            <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
              {event.cover_image_url ? (
                <img
                  className="w-full h-full object-cover"
                  alt="Portada del evento"
                  src={event.cover_image_url}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="w-24 h-24 rounded-full border-2 border-gray-400 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-600">
                      {getInitials(hosts || event.title)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-gray-700 to-gray-500 px-6 py-2 rounded-full border-4 border-white shadow-lg">
                <span className="text-white font-semibold">¡Únete al evento!</span>
              </div>
            </div>
          </div>

          {/* Datos del evento */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-8">
            {hosts && (
              <h2 className="text-2xl text-gray-700 font-serif mb-2">{hosts}</h2>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {event.title}
            </h1>

            <div className="space-y-2 text-gray-600 mb-6">
              <div className="flex items-center justify-center">
                <Calendar className="w-5 h-5 mr-2 text-gray-500" />
                <span>
                  {eventDate.toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC',
                  })}
                </span>
              </div>

              {location_fallback && (
                <div className="flex items-center justify-center">
                  <MapPin className="w-5 h-5 mr-2 text-gray-500" />
                  <span>{location_fallback}</span>
                </div>
              )}
            </div>

            {event.description && (
              <p className="text-gray-700 leading-relaxed mb-6">{event.description}</p>
            )}

            {/* Nombre opcional */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-3">
                Ingresa tu nombre (opcional):
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-center"
                onKeyPress={(e) => e.key === 'Enter' && handleGuestAccess(defaultAction)}
              />
            </div>
          </div>

          {/* Botones de acción */}
          <div className="space-y-4">
            <Button
              onClick={() => handleGuestAccess('upload')}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-800 hover:to-gray-600 text-white py-4 text-lg rounded-xl shadow-md transform hover:scale-105 transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Subir Fotos y Videos
            </Button>

            <Button
              onClick={() => handleGuestAccess('guestbook')}
              variant="outline"
              className="w-full border-gray-300 text-white hover:bg-gray-400 py-4 text-lg rounded-xl"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Dejar Mensaje
            </Button>

            {event.settings?.allowGalleryView && (
              <Button
                onClick={() => handleGuestAccess('gallery')}
                variant="outline"
                className="w-full border-gray-300 text-white hover:bg-gray-400 py-4 text-lg rounded-xl"
              >
                <Eye className="w-5 h-5 mr-2" />
                Ver Galería
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventLanding;
