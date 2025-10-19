// src/components/gallery/HeroHeader.jsx
import React, { useEffect, useState } from 'react';
import { ChevronDown, Download, Play, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

  return (
    <>
      <section className="hero-grid">
        <div className="hero-bg">
          <img
            src={coverUrl}
            alt="Portada del evento"
            decoding="async"
            fetchpriority="high"
            className={heroLoaded ? 'loaded' : ''}
            onLoad={() => setHeroLoaded(true)}
            style={{
              filter: 'var(--hero-image-filter, blur(6px))',
              opacity: 'var(--hero-image-opacity, 0.85)',
              transform: 'var(--hero-image-transform, scale(1.05))',
              transition: 'filter .5s ease, opacity .4s ease',
            }}
          />
          <div
            className="hero-overlay"
            style={{ background: 'var(--gallery-hero-overlay, var(--hero-overlay, rgba(0,0,0,.45)))' }}
          />

          <div className="hero-decor-frame pointer-events-none" aria-hidden="true" />

          {(hostsText || initials) && (
            <div className="absolute inset-0 z-10 pointer-events-none">
              {hostsText && (
                <div
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
                  {hostsText}
                </div>
              )}

              {initials && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ display: headingMode === 'initials' ? 'flex' : 'none' }}
                  aria-label={`Iniciales de ${hostsText || ''}`}
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
                      style={{
                        color: 'var(--hero-initials-color, #fff)',
                        textShadow: 'var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45))',
                      }}
                    >
                      {initials}
                    </span>
                  </div>
                </div>
              )}
              {eventType && (
                <div
                  className="font-raleway"
                  style={{
                    position: 'absolute',
                    left: 'var(--hero-subtitle-x, 50%)',
                    top: 'var(--hero-subtitle-y, calc(var(--hero-title-y, 50%) + 8%))',
                    transform: 'translate(-50%, -50%)',
                    color: 'var(--hero-subtitle-color, var(--hero-initials-color, #fff))',
                    textShadow: 'var(--hero-subtitle-shadow, var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45)))',
                    fontSize: 'var(--hero-subtitle-size, clamp(16px, 3.2vw, 22px))',
                    fontWeight: 'var(--hero-subtitle-weight, 600)',
                    letterSpacing: 'var(--hero-subtitle-tracking, .02em)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                  }}
                  aria-label={`Tipo de evento: ${eventType}`}
                >
                  {eventType}
                </div>
              )}
            </div>
          )}

          {/* Botón Ver Galería minimalista: solo texto subrayado */}
          <div className="absolute z-10 bottom-16 left-0 right-0 flex justify-center">
            <button
              onClick={onScrollToGallery}
              aria-label="Saltar a la galería"
              className="p-0 m-0 bg-transparent border-0 shadow-none rounded-none underline underline-offset-4 decoration-1 hover:opacity-90 focus:outline-none focus:ring-0"
              style={{ color: '#fff', background: 'transparent' }}
            >
              Ver galería
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
