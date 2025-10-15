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
    <section className="hero-grid">
      <div className="hero-bg">
        <img
          src={coverUrl}
          alt="Portada del evento"
          decoding="async"
          fetchpriority="high"
          className={heroLoaded ? 'loaded' : ''}
          onLoad={() => setHeroLoaded(true)}
          /* Permite que la plantilla ajuste el filtro/escala si lo desea */
          style={{
            filter: 'var(--hero-image-filter, blur(6px))',
            opacity: 'var(--hero-image-opacity, 0.85)',
            transform: 'var(--hero-image-transform, scale(1.05))',
            transition: 'filter .5s ease, opacity .4s ease',
            // El object-position (Set Focal) lo controla el CSS global en EventGallery.jsx
          }}
        />
        {/* overlay controlado por variable, con alias de compatibilidad */}
        <div
          className="hero-overlay"
          style={{
            background:
              'var(--gallery-hero-overlay, var(--hero-overlay, rgba(0,0,0,.45)))',
          }}
        />

        {/* ⬇️ NUEVO: capa decorativa (marco/ornamentos) sobre el hero
            Se estiliza vía CSS (.hero-decor-frame) y tokens en templates.css */}
        <div
          className="hero-decor-frame pointer-events-none"
          aria-hidden="true"
        />

        {/* Capa de contenido centrada; dentro alternamos "iniciales" o "nombres" */}
        {(hostsText || initials) && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* NOMBRES (controlados por --hero-title-x / --hero-title-y) */}
            {hostsText && (
              <div
                className="font-raleway"
                style={{
                  position: 'absolute',
                  left: 'var(--hero-title-x, 50%)',
                  top: 'var(--hero-title-y, 50%)',
                  transform: 'translate(-50%, -50%)',
                  color: 'var(--hero-initials-color, #fff)',
                  textShadow:
                    'var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45))',
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

            {/* INICIALES (vista anterior) */}
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
                    borderColor:
                      'var(--gallery-hero-circle-border, var(--hero-initials-border, rgba(255,255,255,.55)))',
                    boxShadow:
                      'var(--hero-initials-shadow, 0 8px 30px rgba(0,0,0,.25))',
                    borderWidth: 'var(--hero-initials-border-width, 3px)',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--hero-initials-color, #fff)',
                      textShadow:
                        'var(--hero-initials-text-shadow, 0 2px 12px rgba(0,0,0,.45))',
                    }}
                  >
                    {initials}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="absolute z-10 bottom-6 left-0 right-0 flex justify-center">
          <Button
            onClick={onScrollToGallery}
            /* mantenemos clases por defecto y habilitamos override por variables */
            className="rounded-full px-6 py-5 hero-cta"
            aria-label="Saltar a la galería"
            style={{
              background: 'var(--gallery-hero-btn-bg, rgba(255,255,255,.20))',
              color: 'var(--gallery-hero-btn-text, #fff)',
              borderColor: 'var(--gallery-hero-btn-border, rgba(255,255,255,.40))',
              borderWidth: 'var(--hero-cta-border-width, 1px)',
              backdropFilter: 'var(--hero-cta-blur, none)',
            }}
            onMouseEnter={(e) => {
              const root =
                e.currentTarget.closest('.gallery-theme') ||
                document.documentElement;
              const val =
                getComputedStyle(root)
                  .getPropertyValue('--gallery-hero-btn-bg-hover')
                  ?.trim() || 'rgba(255,255,255,.30)';
              e.currentTarget.style.background = val;
            }}
            onMouseLeave={(e) => {
              const root =
                e.currentTarget.closest('.gallery-theme') ||
                document.documentElement;
              const val =
                getComputedStyle(root)
                  .getPropertyValue('--gallery-hero-btn-bg')
                  ?.trim() || 'rgba(255,255,255,.20)';
              e.currentTarget.style.background = val;
            }}
          >
            Ver galería <ChevronDown className="w-5 h-5 ml-2 chevron-anim" />
          </Button>
        </div>
      </div>

      <div
        className="z-20 bg-white/85 backdrop-blur border-t border-black/10"
        /* Topbar personalizable vía tokens */
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
                <span
                  className="font-raleway text-xl md:text-2xl"
                  style={{ color: 'var(--topbar-title, inherit)' }}
                >
                  {hostsText || eventTitle}
                </span>
              </div>
              {eventDate && (
                <div
                  className="pt-1 text-xs md:text-sm text-black/60"
                  style={{ color: 'var(--topbar-subtitle, rgba(0,0,0,.6))' }}
                >
                  {eventTitle} —{' '}
                  {eventDate.toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
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
                style={{
                  color: 'var(--topbar-icon, inherit)',
                  background: 'var(--topbar-icon-bg, transparent)',
                }}
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-black/5"
                onClick={onShare}
                aria-label="Compartir enlace de la galería"
                style={{
                  color: 'var(--topbar-icon, inherit)',
                  background: 'var(--topbar-icon-bg, transparent)',
                }}
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-black/5"
                onClick={onOpenSlideshow}
                aria-label="Reproducir presentación"
                style={{
                  color: 'var(--topbar-icon, inherit)',
                  background: 'var(--topbar-icon-bg, transparent)',
                }}
              >
                <Play className="w-5 h-5" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroHeader;
