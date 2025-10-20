// src/components/gallery/LightboxModal.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const LightboxModal = ({ event, uploads, startIndex, onClose, closeBtnRef, onRequestSlideshow }) => {
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  // Swipe en móviles
  const touchStart = useRef({ x: 0, y: 0 });
  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    const absX = Math.abs(dx), absY = Math.abs(dy);
    if (absX > 50 && absX > absY) {
      if (dx < 0) goToNext(); else goToPrev();
    }
  };

  // Prefetch next/prev para imágenes
  useEffect(() => {
    const preload = (i) => {
      const u = uploads[i];
      if (!u || u.type === 'video') return;
      const img = new Image();
      img.src = (u.web_url || u.file_url);
    };
    if (uploads.length) {
      preload((currentIndex + 1) % uploads.length);
      preload((currentIndex - 1 + uploads.length) % uploads.length);
    }
  }, [currentIndex, uploads]);

  const goToNext = useCallback(() => setCurrentIndex(prev => (prev + 1) % uploads.length), [uploads.length]);
  const goToPrev = useCallback(() => setCurrentIndex(prev => (prev - 1 + uploads.length) % uploads.length), [uploads.length]);

  // Accesibilidad: key bindings y foco inicial
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goToNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrev(); }
      else if (e.key === ' ') { e.preventDefault(); onRequestSlideshow?.(currentIndex); }
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef?.current?.focus?.();
    return () => window.removeEventListener('keydown', onKey);
  }, [goToNext, goToPrev, onClose, closeBtnRef, currentIndex, onRequestSlideshow]);

  const currentMedia = uploads[currentIndex];
  if (!currentMedia) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!event?.settings?.allowDownloads) {
      toast({ title: 'Descargas deshabilitadas', variant: 'destructive' });
      return;
    }

    const url = currentMedia.file_url || currentMedia.web_url || currentMedia.thumb_url;
    if (!url) {
      toast({ title: 'No hay archivo disponible para descargar', variant: 'destructive' });
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = (currentMedia.file_name || currentMedia.title || 'mitus-foto.webp').replace(/\s+/g, '-');
    document.body.appendChild(a);
    a.click();
    a.remove();
  };


  const mediaUrl = currentMedia.type === 'video' ? currentMedia.file_url : (currentMedia.web_url || currentMedia.file_url);
  const displayName = currentMedia.file_name || currentMedia.title || (currentMedia.file_url ? currentMedia.file_url.split('/').pop().split('?')[0] : '');

  return (
    <AnimatePresence>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Visor de imágenes"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center no-save"
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}   // ⬅️ añadido
        style={{
          // Permite tematizar el fondo del modal sin alterar el look actual
          background: 'var(--lightbox-bg, #ffffff)',
        }}
      >

        <div className="sr-only" aria-live="polite">
          {`Mostrando elemento ${currentIndex + 1} de ${uploads.length}`}
        </div>

        <div
          className="absolute top-0 right-0 p-4 flex items-center gap-2 z-10"
          style={{
            color: 'var(--lightbox-controls-fg, #000)',
          }}
        >
          {event?.settings?.allowDownloads && (
            <Button
              variant="ghost"
              size="icon"
              className="text-black hover:bg-black/10 rounded-full"
              onClick={handleDownload}
              aria-label="Descargar archivo actual"
              style={{
                // El color hereda a los íconos; hover de Tailwind sigue activo
                color: 'var(--lightbox-controls-fg, #000)',
              }}
            >
              <Download />
            </Button>
          )}
          <Button
            ref={closeBtnRef}
            variant="ghost"
            size="icon"
            className="text-black rounded-full hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-transform duration-150 ease-out hover:scale-110 hover:opacity-80 hover:shadow-[0_0_0_2px_rgba(0,0,0,.15)]"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Cerrar visor"
            style={{
              color: 'var(--lightbox-controls-fg, #000)',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
              boxShadow: 'none',
              willChange: 'transform',
            }}
          >
            <X />
          </Button>

        </div>

        <div
          className="relative w-full h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex absolute left-4 text-black bg-black/10 hover:bg-black/20 rounded-full h-12 w-12"
            onClick={goToPrev}
            aria-label="Anterior"
            style={{
              color: 'var(--lightbox-nav-icon, #000)',
            }}
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
                ? (
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    className="lightbox-media"
                    style={{
                      filter: 'var(--lightbox-media-filter, none)',
                      transition: 'var(--lightbox-media-transition, filter .25s ease)',
                    }}

                    // ⬇️ añadidos
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                  />

                )
                : (
                  <img
                    src={mediaUrl}
                    alt={currentMedia.title || 'Foto del evento'}
                    className="lightbox-media"
                    decoding="async"
                    style={{
                      filter: 'var(--lightbox-media-filter, none)',
                      transition: 'var(--lightbox-media-transition, filter .25s ease)',
                    }}

                    // ⬇️ añadidos
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                )}
            </motion.div>
          </AnimatePresence>
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex absolute right-4 text-black bg-black/10 hover:bg-black/20 rounded-full h-12 w-12"
            onClick={goToNext}
            aria-label="Siguiente"
            style={{
              color: 'var(--lightbox-nav-icon, #000)',
            }}
          >
            <ArrowRight />
          </Button>

          {(event?.settings?.showFileName ?? false) && displayName && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <div
                className="px-3 py-1 rounded-md text-sm text-black/60 bg-white/70 backdrop-blur-sm"
                style={{
                  color: 'var(--lightbox-caption-fg, rgba(0,0,0,.6))',
                  background: 'var(--lightbox-caption-bg, rgba(255,255,255,.7))',
                  backdropFilter: 'var(--lightbox-caption-backdrop, blur(4px))',
                }}
              >
                {displayName}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LightboxModal;
