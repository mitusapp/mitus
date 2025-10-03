// src/pages/EventGallery.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ChevronDown, Download, Pause, Play, Share2, X,
  Image as ImageIcon, Video as VideoIcon, KeyRound
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import LoadingSpinner from '@/components/LoadingSpinner';

const DEFAULT_CATEGORY = 'Más momentos';

// Categorías únicas, ordenadas alfabéticamente (normalizando a DEFAULT_CATEGORY)
const useCategories = (uploads) => useMemo(() => {
  const set = new Set();
  uploads.forEach(u => set.add(((u.category || DEFAULT_CATEGORY) + '').trim()));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}, [uploads]);

const isLandscapeViewport = () => window.innerWidth >= window.innerHeight;

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(/&|y/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]} & ${parts[1][0]}`.toUpperCase();
  return name[0].toUpperCase();
};

// Carga dimensiones reales de una imagen
const loadImageSize = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });

const slugCat = (s) => (s || DEFAULT_CATEGORY).toLowerCase().replace(/[^a-z0-9]+/gi, '-');

const EventGallery = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);

  // La barra de categorías es navegación, no filtro.
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(null);
  const [isSlideshow, setIsSlideshow] = useState(false);

  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadCode, setDownloadCode] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const [coverUrl, setCoverUrl] = useState(null);
  const [heroLoaded, setHeroLoaded] = useState(false);

  // Sticky shadow para la barra de categorías
  const [stickyShadow, setStickyShadow] = useState(false);
  const stickySentinelRef = useRef(null);

  // Referencia para devolver el foco al cerrar el visor
  const lastActiveElRef = useRef(null);
  const closeBtnRef = useRef(null);

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title, date, cover_image_url, settings, invitation_details')
        .eq('id', eventId)
        .single();

      if (eventError || !eventData) {
        toast({ title: 'Evento no encontrado', variant: 'destructive' });
        navigate('/');
        return;
      }
      setEvent(eventData);

      const { data: uploadsData, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: true });

      if (uploadsError) throw uploadsError;

      // Normaliza categoría y asegura valor por defecto; dejamos el resto TAL CUAL
      const normalized = (uploadsData || []).map(u => ({
        ...u,
        category: ((u.category || DEFAULT_CATEGORY) + '').trim(),
      }));
      setUploads(normalized);
    } catch (error) {
      console.error('Error fetching gallery data:', error);
      toast({
        title: 'Error al cargar la galería',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [eventId, navigate]);

  useEffect(() => { fetchEventData(); }, [fetchEventData]);

  // Selección de portada mejorada por orientación (no bloqueante)
  const pickCoverAsync = useCallback(async (allUploads) => {
    if (!allUploads?.length) return event?.cover_image_url || null;

    const wantLandscape = isLandscapeViewport();
    const images = allUploads.filter(u => u.type !== 'video');
    const candidates = images.length ? images : allUploads; // si no hay fotos, usar videos (mostrar primer frame)
    if (!candidates.length) return event?.cover_image_url || null;

    for (let i = 0; i < Math.min(candidates.length, 12); i++) {
      const u = candidates[i];
      const src = u.file_url;
      const size = await loadImageSize(src);
      if (size && size.w && size.h) {
        const isLandscape = size.w >= size.h;
        if ((wantLandscape && isLandscape) || (!wantLandscape && !isLandscape)) {
          return src;
        }
      }
    }
    return images[0]?.file_url || event?.cover_image_url || candidates[0]?.file_url || null;
  }, [event?.cover_image_url]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const chosen = await pickCoverAsync(uploads);
      if (!cancelled) setCoverUrl(chosen || 'https://images.unsplash.com/photo-1617183478968-6e7f5a6406fd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D');
    })();
    return () => { cancelled = true; };
  }, [uploads, pickCoverAsync]);

  // Sticky shadow: cuando el sentinel sale de vista, activamos sombra
  useEffect(() => {
    const el = stickySentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setStickyShadow(!entry.isIntersecting),
      { root: null, threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ---- ORDENACIÓN Y NAVEGACIÓN POR CATEGORÍAS (no filtra, sólo anclas) ----
  const categories = useCategories(uploads);

  // uploads ordenados por categoría y luego por uploaded_at (y por id como respaldo)
  const sortedUploads = useMemo(() => {
    const arr = [...uploads];
    arr.sort((a, b) => {
      const ca = ((a.category || DEFAULT_CATEGORY) + '').trim();
      const cb = ((b.category || DEFAULT_CATEGORY) + '').trim();
      const byCat = ca.localeCompare(cb, 'es', { sensitivity: 'base' });
      if (byCat !== 0) return byCat;
      const ta = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const tb = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return (a.id || 0) - (b.id || 0);
    });
    return arr;
  }, [uploads]);

  // Índice del primer elemento de cada categoría (para slideshow / fallback)
  const firstIndexByCategory = useMemo(() => {
    const map = {};
    for (let i = 0; i < sortedUploads.length; i++) {
      const cat = ((sortedUploads[i].category || DEFAULT_CATEGORY) + '').trim();
      if (map[cat] === undefined) map[cat] = i;
    }
    return map;
  }, [sortedUploads]);

  // Mapa id -> índice global (para abrir visor desde cualquier item)
  const indexById = useMemo(() => {
    const m = new Map();
    sortedUploads.forEach((u, i) => m.set(u.id, i));
    return m;
  }, [sortedUploads]);

  // Observer para activar la categoría según el scroll (anclas invisibles)
  useEffect(() => {
    if (!categories.length) return;
    const options = { root: null, rootMargin: '0px 0px -75% 0px', threshold: 0 };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const cat = entry.target.getAttribute('data-cat');
          if (cat) setActiveCategory(cat);
        }
      });
    }, options);

    categories.forEach((cat) => {
      const el = document.getElementById(`cat-${slugCat(cat)}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [categories]);

  const scrollToCategory = (cat) => {
    const el = document.getElementById(`cat-${slugCat(cat)}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveCategory(cat);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: 'Enlace copiado al portapapeles' });
  };

  const openSlideshow = () => {
    if (sortedUploads.length === 0) {
      toast({ title: 'Galería vacía', description: 'No hay imágenes para el slideshow.' });
      return;
    }
    const start = firstIndexByCategory[activeCategory] ?? 0;
    setSelectedMediaIndex(start);
    setIsSlideshow(true);
  };

  const handleDownloadRequest = () => {
    if (!event?.settings?.downloadCode) {
      toast({
        title: 'Descarga no habilitada',
        description: 'El anfitrión no ha configurado un código de descarga.',
        variant: 'destructive'
      });
      return;
    }
    setIsDownloadModalOpen(true);
  };

  const handleConfirmDownload = async () => {
    if (isDownloading) return;

    if (downloadCode !== event.settings.downloadCode) {
      toast({ title: 'Código incorrecto', variant: 'destructive' });
      return;
    }
    if (event.settings.downloadLimit <= 0) {
      toast({ title: 'Límite de descargas alcanzado', variant: 'destructive' });
      return;
    }

    setIsDownloading(true);
    toast({ title: 'Preparando descarga...', description: 'Esto puede tardar unos minutos.' });

    const zip = new JSZip();
    for (const upload of uploads) {
      try {
        const response = await fetch(upload.file_url);
        const blob = await response.blob();
        zip.file(upload.file_name || `${upload.id}`, blob);
      } catch (e) {
        console.error(`Failed to fetch ${upload.file_url}`, e);
      }
    }

    zip.generateAsync({ type: 'blob' }).then(async (content) => {
      saveAs(content, `mitus-galeria-${eventId}.zip`);
      toast({ title: '¡Descarga completa!', description: 'Tu archivo ZIP está listo.' });

      const newLimit = event.settings.downloadLimit - 1;
      const { error } = await supabase
        .from('events')
        .update({ settings: { ...event.settings, downloadLimit: newLimit } })
        .eq('id', eventId);
      if (error) console.error('Error updating download limit:', error);

      setIsDownloadModalOpen(false);
      setIsDownloading(false);
      setDownloadCode('');
    });
  };

  const eventDate = event ? new Date(event.date?.replace(/-/g, '/')) : null;
  const hostsText = event?.invitation_details?.hosts?.join(' & ') || event?.title || '';
  const initials = getInitials(hostsText);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="bg-white text-[#1E1E1E] min-h-screen">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@600;700&family=Lato:wght@300;400;500&display=swap');
          .font-raleway{font-family:'Raleway',sans-serif;}
          .font-lato{font-family:'Lato',sans-serif;}
          .masonry { column-count: 2; column-gap: 8px; }
          .masonry-item { break-inside: avoid; margin-bottom: 8px; }
          @media (min-width: 1024px) { .masonry { column-count: 4; column-gap: 12px; } .masonry-item { margin-bottom: 12px; } }

          /* Altura exacta de pantalla para móviles: usar dvh/svh con fallback a vh */
          .hero-grid { display: grid; grid-template-rows: 1fr auto; min-height: 100vh; height: 100vh; }
          @supports (height: 100svh) { .hero-grid { min-height: 100svh; height: 100svh; } }
          @supports (height: 100dvh) { .hero-grid { min-height: 100dvh; height: 100dvh; } }

          .hero-bg { position: relative; overflow: hidden; }
          .hero-bg img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.05); transition: filter .5s ease, opacity .4s ease; filter: blur(6px); opacity: .85; }
          .hero-bg img.loaded { filter: blur(0); opacity: 1; }

          .hero-overlay { position: absolute; inset: 0; background: rgba(0,0,0,.45); }
          .initials-circle { width: clamp(120px, 22vw, 200px); height: clamp(120px, 22vw, 200px); border-radius: 9999px; display: flex; align-items: center; justify-content: center; background: transparent; backdrop-filter: none; border: 3px solid rgba(255,255,255,.55); box-shadow: 0 8px 30px rgba(0,0,0,.25); }
          .initials-circle span{ font-family: 'Lato', sans-serif; font-weight: 800; font-size: clamp(28px, 6vw, 48px); color: #fff; letter-spacing: .04em; white-space: nowrap; text-shadow: 0 2px 12px rgba(0,0,0,.45); }
          .lightbox-media { max-width: 100vw; max-height: 100vh; width: auto; height: auto; object-fit: contain; }

          /* Micro-animación del chevron */
          @keyframes nudge {
            0% { transform: translateY(0); opacity: .9; }
            50% { transform: translateY(4px); opacity: 1; }
            100% { transform: translateY(0); opacity: .9; }
          }
          .chevron-anim { animation: nudge 1.6s ease-in-out infinite; }
        `}
      </style>

      <section className="hero-grid">
        <div className="hero-bg">
          <img
            src={coverUrl}
            alt="Portada del evento"
            decoding="async"
            fetchpriority="high"
            className={heroLoaded ? 'loaded' : ''}
            onLoad={() => setHeroLoaded(true)}
          />
          <div className="hero-overlay" />
          {hostsText && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" aria-label={`Iniciales de ${hostsText}`}>
              <div className="initials-circle font-lato">
                <span>{initials}</span>
              </div>
            </div>
          )}
          <div className="absolute z-10 bottom-6 left-0 right-0 flex justify-center">
            <Button
              onClick={() => document.getElementById('gallery-start')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-full px-6 py-5"
              aria-label="Saltar a la galería"
            >
              Ver galería <ChevronDown className="w-5 h-5 ml-2 chevron-anim" />
            </Button>
          </div>
        </div>

        <div className="z-20 bg-white/85 backdrop-blur border-t border-black/10">
          <div className="max-w-[1400px] mx-auto px-4">
            <div className="flex items-center justify-between py-4">
              <div className="text-left">
                <div className="flex items-baseline gap-3">
                  <span className="font-raleway text-xl md:text-2xl">
                    {event?.invitation_details?.hosts?.join(' & ') || event?.title}
                  </span>
                </div>
                {eventDate && (
                  <div className="pt-1 text-xs md:text-sm text-black/60">
                    {event?.title} — {eventDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>
              <nav className="flex items-center gap-2">
                <Button
                  variant="ghost" size="icon"
                  className="rounded-full hover:bg-black/5"
                  onClick={handleDownloadRequest}
                  aria-label="Descargar galería completa"
                >
                  <Download className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="rounded-full hover:bg-black/5"
                  onClick={handleShare}
                  aria-label="Compartir enlace de la galería"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="rounded-full hover:bg-black/5"
                  onClick={openSlideshow}
                  aria-label="Reproducir presentación"
                >
                  <Play className="w-5 h-5" />
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* Sentinel para detectar sticky activo */}
      <div ref={stickySentinelRef} />

      <section className={`sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/10 ${stickyShadow ? 'shadow-sm' : ''}`}>
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="w-full overflow-x-auto">
            <ul className="flex gap-6 text-sm md:text-base font-lato">
              {categories.map(cat => (
                <li key={cat}>
                  <button
                    onClick={() => scrollToCategory(cat)}
                    className={`relative py-3 inline-block ${cat === activeCategory ? 'text-black' : 'text-black/60 hover:text-black'}`}
                    aria-current={cat === activeCategory ? 'page' : undefined}
                    aria-label={`Ir a categoría ${cat}`}
                  >
                    {cat}
                    <span className={`absolute left-0 right-0 bottom-0 h-[2px] ${cat === activeCategory ? 'bg-black' : 'bg-transparent'}`} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div id="gallery-start" />
      <main>
        <section className="w-full px-2 sm:px-3 lg:px-4 py-6 lg:py-10">
          <div className="masonry">
            {/* Anclas invisibles + elementos ordenados por categoría */}
            {categories.flatMap((cat) => {
              const items = sortedUploads.filter(u => ((u.category || DEFAULT_CATEGORY) + '').trim() === cat);
              const anchor = (
                <div
                  key={`anchor-${cat}`}
                  id={`cat-${slugCat(cat)}`}
                  data-cat={cat}
                  className="masonry-item"
                  style={{ height: 0, margin: 0, padding: 0 }}
                />
              );
              const nodes = items.map((upload) => (
                <motion.div
                  key={upload.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="masonry-item cursor-pointer"
                  onClick={() => {
                    lastActiveElRef.current = document.activeElement;
                    const idx = indexById.get(upload.id) ?? 0;
                    setSelectedMediaIndex(idx);
                  }}
                  title={upload.title || ''}
                >
                  {upload.type === 'video' ? (
                    <div className="relative bg-black">
                      <video src={upload.file_url} className="w-full h-auto" playsInline muted />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <VideoIcon className="w-10 h-10 text-white/90" />
                      </div>
                    </div>
                  ) : (
                    <img
                      src={upload.file_url}
                      alt={upload.title || 'Foto del evento'}
                      className="w-full h-auto select-none"
                      loading="lazy"
                      decoding="async"
                    />
                  )}
                </motion.div>
              ));
              return [anchor, ...nodes];
            })}
          </div>

          {sortedUploads.length === 0 && (
            <div className="text-center py-20">
              <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold">Galería vacía</h3>
              <p className="text-gray-600 mt-2">No hay fotos o videos en la galería.</p>
            </div>
          )}
        </section>
      </main>

      <footer className="text-center py-10 border-t border-black/5">
        <p className="text-xs text-black/60">Powered by Mitus</p>
      </footer>

      <AnimatePresence>
        {selectedMediaIndex !== null && (
          <MediaViewer
            event={event}
            uploads={sortedUploads}
            startIndex={selectedMediaIndex}
            onClose={() => {
              setSelectedMediaIndex(null);
              setIsSlideshow(false);
              if (lastActiveElRef.current && lastActiveElRef.current.focus) {
                try { lastActiveElRef.current.focus(); } catch {}
              }
            }}
            isSlideshow={isSlideshow}
            setIsSlideshow={setIsSlideshow}
            closeBtnRef={closeBtnRef}
          />
        )}
      </AnimatePresence>

      <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center"><KeyRound className="w-5 h-5 mr-2 text-black" /> Descargar galería completa</DialogTitle>
            <DialogDescription>Ingresa el código de descarga proporcionado por el anfitrión para descargar todos los archivos en un solo ZIP.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="download-code" className="text-right">Código</Label>
              <input id="download-code" value={downloadCode} onChange={(e) => setDownloadCode(e.target.value)} className="col-span-3 p-2 border rounded-md" placeholder="XXXXXX" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirmDownload} disabled={isDownloading} className="bg-black text-white hover:bg-black/80">{isDownloading ? 'Descargando...' : 'Confirmar y descargar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const MediaViewer = ({ event, uploads, startIndex, onClose, isSlideshow, setIsSlideshow, closeBtnRef }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(isSlideshow);

  // Prefetch next/prev para imágenes
  useEffect(() => {
    const preload = (i) => {
      const u = uploads[i];
      if (!u || u.type === 'video') return;
      const img = new Image();
      img.src = u.file_url;
    };
    preload((currentIndex + 1) % uploads.length);
    preload((currentIndex - 1 + uploads.length) % uploads.length);
  }, [currentIndex, uploads]);

  const goToNext = useCallback(() => setCurrentIndex(prev => (prev + 1) % uploads.length), [uploads.length]);
  const goToPrev = useCallback(() => setCurrentIndex(prev => (prev - 1 + uploads.length) % uploads.length), [uploads.length]);

  useEffect(() => {
    let slideshowInterval;
    if (isPlaying && isSlideshow) slideshowInterval = setInterval(goToNext, 3000);
    return () => clearInterval(slideshowInterval);
  }, [isPlaying, isSlideshow, goToNext]);

  // Accesibilidad: key bindings y foco inicial
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      else if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); setIsSlideshow(true); }
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef?.current?.focus?.();
    return () => window.removeEventListener('keydown', onKey);
  }, [goToNext, goToPrev, onClose, setIsSlideshow, closeBtnRef]);

  const currentMedia = uploads[currentIndex];
  if (!currentMedia) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!event?.settings?.allowDownloads) {
      toast({ title: 'Descargas deshabilitadas', variant: 'destructive' });
      return;
    }
    window.open(currentMedia.file_url, '_blank');
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imágenes"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      <div className="sr-only" aria-live="polite">
        {`Mostrando elemento ${currentIndex + 1} de ${uploads.length}`}
      </div>

      <div className="absolute top-0 right-0 p-4 flex items-center gap-2 z-10">
        {isSlideshow && (
          <Button
            variant="ghost"
            size="icon"
            className="text-black hover:bg-black/10 rounded-full"
            onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            aria-label={isPlaying ? 'Pausar presentación' : 'Reproducir presentación'}
          >
            {isPlaying ? <Pause /> : <Play />}
          </Button>
        )}
        {event?.settings?.allowDownloads && (
          <Button
            variant="ghost"
            size="icon"
            className="text-black hover:bg-black/10 rounded-full"
            onClick={handleDownload}
            aria-label="Descargar archivo actual"
          >
            <Download />
          </Button>
        )}
        <Button
          ref={closeBtnRef}
          variant="ghost"
          size="icon"
          className="text-black hover:bg-black/10 rounded-full"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Cerrar visor"
        >
          <X />
        </Button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 text-black bg-black/10 hover:bg-black/20 rounded-full h-12 w-12"
          onClick={goToPrev}
          aria-label="Anterior"
        >
          <ArrowLeft />
        </Button>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="flex items-center justify-center"
          >
            {currentMedia.type === 'video'
              ? <video src={currentMedia.file_url} controls autoPlay className="lightbox-media" />
              : <img src={currentMedia.file_url} alt={currentMedia.title || 'Foto del evento'} className="lightbox-media" decoding="async" />}
          </motion.div>
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 text-black bg-black/10 hover:bg-black/20 rounded-full h-12 w-12"
          onClick={goToNext}
          aria-label="Siguiente"
        >
          <ArrowRight />
        </Button>
      </div>
    </motion.div>
  );
};

export default EventGallery;
