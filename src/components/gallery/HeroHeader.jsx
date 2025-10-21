// src/components/gallery/HeroHeader.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronDown, Download, Play, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, useReducedMotion } from 'framer-motion';

const HeroHeader = ({
  coverUrl,
  heroLoaded,
  setHeroLoaded,
  hostsText,
  initials,
  eventTitle,
  eventDate,
  onScrollToGallery,
  onDownloadRequest,
  onShare,
  onOpenSlideshow,
  eventType,
}) => {
  // Detecta el modo desde CSS vars: --hero-heading-mode: 'initials' | 'names'
  const [headingMode, setHeadingMode] = useState('initials');

  useEffect(() => {
    try {
      const root =
        document.querySelector('.gallery-theme') || document.documentElement;
      const raw = getComputedStyle(root)
        .getPropertyValue('--hero-heading-mode')
        ?.trim()
        .replace(/^['"]|['"]$/g, '');
      if (raw === 'names' || raw === 'initials') {
        setHeadingMode(raw);
      } else {
        setHeadingMode('initials');
      }
    } catch {
      setHeadingMode('initials');
    }
  }, [hostsText, heroLoaded]);

  // ===== Animación (solo al montar / tras cargar imagen) =====
  const reduce = useReducedMotion();

  // Contenedor que coordina el fade-in y stagger
  const containerV = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { when: 'beforeChildren', staggerChildren: 0.08, delayChildren: 0.2 }
    }
  };

  // Variante SIN mover 'y' (queda disponible si la necesitas)
  const itemV_noY = reduce
    ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.22 } }
    }
    : {
      hidden: { opacity: 0, filter: 'blur(4px)' },
      visible: {
        opacity: 1,
        filter: 'blur(0px)',
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
      }
    };

  // Variante con 'y' (deslizamiento suave)
  const itemV_withY = reduce
    ? {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0.22 } }
    }
    : {
      hidden: { opacity: 0, y: 12, filter: 'blur(4px)' },
      visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
      }
    };

  // --- Asegurar primer paint borroso antes de marcar loaded (incluye imágenes en caché) ---
  const imgRef = useRef(null);
  const triggerLoaded = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setHeroLoaded(true));
    });
  }, [setHeroLoaded]);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) {
      triggerLoaded();
    }
  }, [triggerLoaded]);

  return (
    <>
      <section className="hero-grid">
        <div className="hero-bg">
          <img
            ref={imgRef}
            src={coverUrl}
            alt="Portada del evento"
            decoding="async"
            fetchpriority="high"
            className={heroLoaded ? 'loaded' : ''}
            onLoad={triggerLoaded}
            style={{
              // Cambia de borroso→nítido y de opaco→visible según heroLoaded, respetando tus tiempos
              filter: heroLoaded
                ? 'var(--hero-image-filter-final, blur(0px))'
                : 'var(--hero-image-filter, blur(6px))',
              opacity: heroLoaded
                ? 'var(--hero-image-opacity-final, 1)'
                : 'var(--hero-image-opacity, 0.85)',
              // Mantengo tu transform tal cual (sin animarlo) para no tocar el diseño
              transform: 'var(--hero-image-transform, scale(1.05))',
              transition: 'filter 2s cubic-bezier(.22,1,.36,1), opacity 1.5s cubic-bezier(.22,1,.36,1)',
            }}
          />
          <div
            className="hero-overlay"
            style={{ background: 'var(--gallery-hero-overlay, var(--hero-overlay, rgba(0,0,0,.45)))' }}
          />

          <div className="hero-decor-frame pointer-events-none" aria-hidden="true" />

          {(hostsText || initials) && (
            <motion.div
              className="absolute inset-0 z-10 pointer-events-none"
              variants={containerV}
              initial="hidden"
              animate={heroLoaded ? 'visible' : 'hidden'}
            >
              {hostsText && (
                <div
                  data-hero-title
                  className="font-raleway"
                  style={{
                    position: 'absolute',
                    left: 'var(--hero-title-x, 50%)',
                    top: 'var(--hero-title-y, 50%)',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--hero-initials-color, #fff)',
                    textShadow: 'var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45))',
                    fontSize: 'var(--hero-title-size, clamp(28px, 6vw, 48px))',
                    letterSpacing: '.02em',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    display: headingMode === 'names' ? 'block' : 'none',
                  }}
                  aria-label={`Nombres en portada: ${hostsText}`}
                >
                  <motion.span variants={itemV_withY} style={{ display: 'inline-block' }}>
                    {hostsText}
                  </motion.span>
                </div>
              )}

              {initials && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ display: headingMode === 'initials' ? 'flex' : 'none' }}
                  aria-label={`Iniciales de ${hostsText || ''}`}
                  variants={itemV_withY}
                >
                  <div
                    className="initials-circle font-lato"
                    style={{
                      background: 'var(--hero-initials-bg, transparent)',
                      borderColor: 'var(--gallery-hero-circle-border, var(--hero-initials-border, rgba(255,255,255,.55)))',
                      boxShadow: 'var(--hero-initials-shadow, 0 8px 30px rgba(0,0,0,.25))',
                      borderWidth: 'var(--hero-initials-border-width, 3px)',
                    }}
                  >
                    <span
                      data-hero-title
                      style={{
                        color: 'var(--hero-initials-color, #fff)',
                        textShadow: 'var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45))',
                      }}
                    >
                      {initials}
                    </span>
                  </div>
                </motion.div>
              )}

              {eventType && (
                <div
                  data-hero-subtitle
                  className="font-raleway"
                  style={{
                    position: 'absolute',
                    left: 'var(--hero-subtitle-x, 50%)',
                    top: 'var(--hero-subtitle-y, calc(var(--hero-title-y, 50%) + 8%))',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--hero-subtitle-color, var(--hero-initials-color, #fff))',
                    textShadow: 'var(--hero-subtitle-shadow, var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45)))',
                    fontSize: 'var(--hero-subtitle-size, clamp(16px, 3.2vw, 22px))',
                    fontWeight: 'var(--hero-subtitle-weight, 200)',
                    letterSpacing: 'var(--hero-subtitle-tracking, .02em)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                  aria-label={`Tipo de evento: ${eventType}`}
                >
                  <motion.span variants={itemV_withY} style={{ display: 'inline-block' }}>
                    {eventType}
                  </motion.span>
                </div>
              )}
            </motion.div>
          )}

          {/* Botón Ver Galería minimalista: solo texto subrayado */}
          <div className="absolute z-10 bottom-16 left-0 right-0 flex justify-center">
            <button
              onClick={onScrollToGallery}
              aria-label="Saltar a la galería"
              className="p-0 m-0 bg-transparent border-0 shadow-none rounded-none hover:opacity-90 focus:outline-none focus:ring-0 no-underline"
              style={{ color: '#fff', background: 'transparent' }}
            >
              <motion.span
                initial="hidden"
                animate={heroLoaded ? 'visible' : 'hidden'}
                variants={itemV_withY}
                transition={{ duration: 3, ease: [0.22, 1, 0.36, 1], delay: 3 }}
                className="underline decoration-1 underline-offset-[8px]"   // 👈 más espacio
                style={{ display: 'inline-block' }}
              >
                Ver galería
              </motion.span>
            </button>
          </div>


        </div>
      </section>

      {/* ⬇️ Topbar fuera del hero-grid (aparecerá al hacer scroll) */}
      <div
        id="topbar-start"
        className="z-20 bg-white/85 backdrop-blur border-t border-black/10"
        style={{
          background: 'var(--topbar-bg, rgba(255,255,255,.85))',
          borderColor: 'var(--topbar-border, rgba(0,0,0,.10))',
          backdropFilter: 'var(--topbar-blur, blur(8px))',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="text-left">
              <div className="flex items-baseline gap-3">
                <span className="font-raleway text-xl md:text-2xl" style={{ color: 'var(--topbar-title, inherit)' }}>
                  {hostsText || eventTitle}
                </span>
              </div>
              {eventDate && (
                <div
                  className="pt-1 text-xs md:text-sm text-black/60"
                  style={{ color: 'var(--topbar-subtitle, rgba(0,0,0,.6))' }}
                >
                  {eventTitle} —{' '}
                  {eventDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
            <nav className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-black/5"
                onClick={onDownloadRequest}
                aria-label="Descargar galería completa"
                style={{ color: 'var(--topbar-icon, inherit)', background: 'var(--topbar-icon-bg, transparent)' }}
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-black/5"
                onClick={onShare}
                aria-label="Compartir enlace de la galería"
                style={{ color: 'var(--topbar-icon, inherit)', background: 'var(--topbar-icon-bg, transparent)' }}
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-black/5"
                onClick={onOpenSlideshow}
                aria-label="Reproducir presentación"
                style={{ color: 'var(--topbar-icon, inherit)', background: 'var(--topbar-icon-bg, transparent)' }}
              >
                <Play className="w-5 h-5" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeroHeader;
