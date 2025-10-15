// src/pages/EventLanding.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const fileInputRef = useRef(null);

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

  // Validación de nombre completo (mínimo dos palabras)
  const validateFullName = (name) => /^(?=.{3,})(?:[^\s]+\s+){1,}[^\s].*$/.test((name || '').trim());

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
    // Prefill desde session/local storage
    const stored = sessionStorage.getItem('guestName') || localStorage.getItem(`mitus_guest_name_${eventId}`);
    if (stored) setGuestName(stored);
  }, [fetchEventData, eventId]);

  // Accept según settings (defaults a true si faltan)
  const allowPhoto = event?.settings?.allowPhotoUpload ?? true;
  const allowVideo = event?.settings?.allowVideoUpload ?? true;
  const acceptStr = [allowPhoto ? 'image/*' : null, allowVideo ? 'video/*' : null].filter(Boolean).join(',');

  const persistName = (name) => {
    sessionStorage.setItem('guestName', name);
    localStorage.setItem(`mitus_guest_name_${eventId}`, name);
  };

  const ensureNameOrWarn = () => {
    const required = !!(event?.settings?.requireGuestName);
    const name = (guestName || '').trim();
    if (required) {
      if (!validateFullName(name)) {
        toast({
          title: 'Ingresa tu nombre completo',
          description: 'Este dato es necesario para continuar.',
          variant: 'destructive',
        });
        return false;
      }
      persistName(name);
      return true;
    }
    // No requerido: permitimos continuar, y si hay nombre lo persistimos.
    if (name) persistName(name);
    return true;
  };

  // (Obsoleto para el flujo actual en la landing; se mantiene sin uso para no romper nada)
  const handleOpenPicker = () => {
    if (!ensureNameOrWarn()) return;
    if (!acceptStr) {
      toast({ title: 'Subida deshabilitada', description: 'Este evento no permite subir archivos.', variant: 'destructive' });
      return;
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  // (Obsoleto en el nuevo flujo; navegación ocurre sin preseleccionar archivos)
  const handleFilesChosen = (e) => {
    const files = Array.from(e.target?.files || []);
    if (!files.length) return;
    navigate(`/event/${eventId}/upload`, {
      state: {
        preselectedFiles: files,
        guestName: guestName.trim(),
        fromLanding: true,
      },
    });
  };

  const handleGuestAccess = (action) => {
    // Requerimos nombre solo si el host lo activó
    if (!ensureNameOrWarn()) return;

    if (action === 'upload') {
      // Nuevo comportamiento: NO abrir picker aquí; navegar a GuestUpload con modal de categorías
      if (!allowPhoto && !allowVideo) {
        toast({ title: 'Subida deshabilitada', description: 'Este evento no permite subir archivos.', variant: 'destructive' });
        return;
      }
      navigate(`/event/${eventId}/upload`, {
        state: {
          guestName: (guestName || '').trim(),
          openCategoryModal: true,
          fromLanding: true,
        },
      });
      return;
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
                <span className="text-white font-semibold">¡Haz parte de esta historia!</span>
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

            {/* Nombre OBLIGATORIO u OPCIONAL según settings */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-600 mb-3">
                {event?.settings?.requireGuestName
                  ? 'Ingresa tu nombre (necesario para continuar):'
                  : 'Tu nombre (opcional, para atribuir tus fotos):'}
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleGuestAccess(defaultAction);
                  }
                }}
              />
            </div>
          </div>

          {/* Botones de acción (MISMO DISEÑO) */}
          <div className="space-y-4">
            <Button
              onClick={() => handleGuestAccess('upload')}
              className="w-full bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-800 hover:to-gray-600 text-white py-4 text-lg rounded-xl shadow-md transform hover:scale-105 transition-all duration-300"
            >
              <Upload className="w-5 h-5 mr-2" />
              Subir Fotos y Videos
            </Button>

            {/* Mostrar "Dejar Mensaje" solo si está habilitado en settings */}
            {event?.settings?.allowGuestbook && (
              <Button
                onClick={() => handleGuestAccess('guestbook')}
                variant="outline"
                className="w-full border-gray-300 text-white hover:bg-gray-400 py-4 text-lg rounded-xl"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Dejar Mensaje
              </Button>
            )}

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

      {/* input file oculto para picker inmediato (ya no se usa en este flujo) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptStr}
        multiple
        hidden
        onChange={handleFilesChosen}
      />
    </div>
  );
};

export default EventLanding;
