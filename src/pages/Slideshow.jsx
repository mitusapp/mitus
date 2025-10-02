import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, SkipForward, SkipBack, Settings, Maximize, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const Slideshow = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settings, setSettings] = useState({
    interval: 5000,
    showVideos: true,
    randomOrder: false,
    showInfo: true
  });
  const [loading, setLoading] = useState(true);

  const fetchSlideshowData = useCallback(async () => {
    setLoading(true);
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title, settings')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast({ title: "Evento no encontrado", variant: "destructive" });
      navigate('/');
      return;
    }
    setEvent(eventData);

    let query = supabase
      .from('uploads')
      .select('*')
      .eq('event_id', eventId)
      .eq('approved', true);

    if (!settings.showVideos) {
      query = query.eq('type', 'photo');
    }

    const { data: uploadsData, error: uploadsError } = await query;

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
      setUploads([]);
    } else {
      setUploads(settings.randomOrder ? [...uploadsData].sort(() => Math.random() - 0.5) : uploadsData);
    }
    setLoading(false);
  }, [eventId, navigate, settings.showVideos, settings.randomOrder]);

  useEffect(() => {
    fetchSlideshowData();
  }, [fetchSlideshowData]);

  useEffect(() => {
    let interval;
    if (isPlaying && uploads.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % uploads.length);
      }, settings.interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, uploads.length, settings.interval]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const nextSlide = () => setCurrentIndex(prev => (prev + 1) % uploads.length);
  const prevSlide = () => setCurrentIndex(prev => (prev - 1 + uploads.length) % uploads.length);

  const toggleSettings = () => {
    toast({
      title: "🚧 Esta función no está implementada aún",
      description: "¡Pero no te preocupes! Puedes solicitarla en tu próximo prompt! 🚀"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando slideshow...</p>
        </div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
            <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No hay contenido para mostrar</h2>
            <p className="text-gray-300 mb-6">Aún no hay fotos o videos aprobados.</p>
            <Button onClick={() => navigate(`/host/${eventId}`)} className="bg-purple-600 hover:bg-purple-700 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentUpload = uploads[currentIndex];

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'} bg-black`}>
      {!isFullscreen && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-white">Slideshow</h1>
                <p className="text-gray-300 text-sm">{event.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={toggleSettings} variant="ghost" size="sm" className="text-white hover:bg-white/10"><Settings className="w-4 h-4" /></Button>
              <Button onClick={toggleFullscreen} variant="ghost" size="sm" className="text-white hover:bg-white/10"><Maximize className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      )}

      {isFullscreen && (
        <Button onClick={toggleFullscreen} variant="ghost" size="sm" className="absolute top-4 right-4 z-20 text-white hover:bg-white/10">
          <X className="w-5 h-5" />
        </Button>
      )}

      <div className="relative w-full h-full flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} transition={{ duration: 0.5 }} className="relative w-full h-full flex items-center justify-center">
            {currentUpload.type === 'video' ? (
              <video src={currentUpload.file_url} autoPlay muted loop className="max-w-full max-h-full object-contain" />
            ) : (
              <img className="max-w-full max-h-full object-contain" alt={currentUpload.title || 'Foto del evento'} src={currentUpload.file_url} />
            )}
            {settings.showInfo && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <div className="text-white">
                  <h3 className="text-xl font-semibold mb-1">{currentUpload.title || currentUpload.file_name}</h3>
                  <p className="text-gray-300">Por {currentUpload.guest_name}</p>
                  {currentUpload.description && <p className="text-gray-200 mt-2">{currentUpload.description}</p>}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
          <Button onClick={prevSlide} variant="ghost" size="sm" className="text-white hover:bg-white/10 rounded-full"><SkipBack className="w-5 h-5" /></Button>
          <Button onClick={() => setIsPlaying(!isPlaying)} variant="ghost" size="sm" className="text-white hover:bg-white/10 rounded-full">{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</Button>
          <Button onClick={nextSlide} variant="ghost" size="sm" className="text-white hover:bg-white/10 rounded-full"><SkipForward className="w-5 h-5" /></Button>
          <div className="text-white text-sm ml-4">{currentIndex + 1} / {uploads.length}</div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <motion.div className="h-full bg-purple-500" initial={{ width: 0 }} animate={{ width: isPlaying ? '100%' : '0%' }} transition={{ duration: settings.interval / 1000, ease: 'linear' }} key={`${currentIndex}-${isPlaying}`} />
        </div>
      </div>
    </div>
  );
};

export default Slideshow;