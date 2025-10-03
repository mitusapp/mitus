// src/pages/EventLanding.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, MessageSquare, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Requisitos implementados:
 * - QR y links SIEMPRE llegan a esta Landing.
 * - Campo obligatorio: "Ingresa tu nombre (necesario para continuar)".
 * - Al presionar "Subir Fotos y Videos":
 *    → valida nombre
 *    → abre el picker inmediatamente
 *    → tras elegir archivos navega a /event/:id/upload con los archivos en state
 * - Se respeta allowGalleryView para mostrar "Ver galería".
 * - El tipo de archivos aceptados (accept) se arma con allowPhotoUpload/allowVideoUpload (defaults true si faltan).
 */

const EventLanding = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Cargar evento
  const fetchEvent = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error(error);
      toast({ title: 'No se pudo cargar el evento', description: error.message, variant: 'destructive' });
    }
    setEvent(data || null);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
    // Prefill nombre si ya existía
    const cached = localStorage.getItem(`mitus_guest_name_${eventId}`);
    if (cached) setGuestName(cached);
  }, [fetchEvent, eventId]);

  const allowPhoto = event?.settings?.allowPhotoUpload ?? true;
  const allowVideo = event?.settings?.allowVideoUpload ?? true;
  const acceptStr = [allowPhoto ? 'image/*' : null, allowVideo ? 'video/*' : null].filter(Boolean).join(',');

  const validateFullName = (name) => {
    // Mínimo dos palabras
    return /^(?=.{3,})(?:[^\s]+\s+){1,}[^\s].*$/.test(name.trim());
  };

  const handleOpenPicker = () => {
    if (!validateFullName(guestName)) {
      toast({
        title: 'Ingresa tu nombre completo',
        description: 'Este dato es necesario para continuar y asociar tus archivos.',
        variant: 'destructive',
      });
      return;
    }
    localStorage.setItem(`mitus_guest_name_${eventId}`, guestName.trim());
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFilesChosen = (e) => {
    const files = Array.from(e.target?.files || []);
    if (!files.length) return;
    // Pasamos archivos y nombre vía state al uploader
    navigate(`/event/${eventId}/upload`, {
      state: {
        preselectedFiles: files,
        guestName: guestName.trim(),
        fromLanding: true,
      },
      replace: false,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Cargando…</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-xl font-semibold mb-2">Evento no encontrado</div>
          <div className="text-muted-foreground">Verifica el enlace recibido.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Portada (simple) */}
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden border bg-muted mb-6">
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt="Portada del evento" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                Sin imagen de portada
              </div>
            )}
          </div>

          {/* Título / datos básicos */}
          <div className="text-center space-y-1 mb-8">
            <h1 className="text-2xl font-bold tracking-tight">{event.title || 'Evento'}</h1>
            {event.date && <p className="text-sm text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>}
            {event.location && <p className="text-sm text-muted-foreground">{event.location}</p>}
          </div>

          {/* Nombre invitado obligatorio */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Ingresa tu nombre (necesario para continuar)</label>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nombre y apellido"
              className="w-full px-4 py-3 rounded-xl border bg-background"
            />
          </div>

          {/* Acciones */}
          <div className="space-y-4">
            <Button onClick={handleOpenPicker} className="w-full py-4 text-base">
              <Upload className="w-5 h-5 mr-2" />
              Subir Fotos y Videos
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptStr}
              multiple
              hidden
              onChange={handleFilesChosen}
            />

            <Button
              onClick={() => navigate(`/event/${eventId}/guestbook`)}
              variant="outline"
              className="w-full py-4 text-base"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Dejar mensaje
            </Button>

            {event?.settings?.allowGalleryView !== false && (
              <Button
                onClick={() => navigate(`/event/${eventId}/gallery`)}
                variant="secondary"
                className="w-full py-4 text-base"
              >
                <Eye className="w-5 h-5 mr-2" />
                Ver galería
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EventLanding;
