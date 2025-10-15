// src/gallery/theme/GalleryThemeProvider.jsx
import React, { createContext, useContext, useMemo } from 'react';
import { resolveTemplate, getTemplateById } from '@/gallery/templates/registry';

// Mapea tokens (vars) a clases Tailwind/estilos usados por la UI actual
function computeClasses(template) {
  const v = template.vars || {};

  // CTA del Hero
  const ctaMap = {
    glass:  'bg-white/20 hover:bg-white/30 border border-white/40 text-white rounded-full',
    solid:  'bg-black text-white hover:bg-black/80 rounded-full',
    outline:'bg-transparent text-white border border-white/60 hover:bg-white/10 rounded-full'
  };
  const heroCTA = ctaMap[String(v['hero.cta'] || 'glass')] || ctaMap.glass;

  // Alineación del contenido en Hero
  const alignMap = {
    left:   'items-start text-left',
    right:  'items-end text-right',
    center: 'items-center text-center'
  };
  const heroAlign = alignMap[String(v['hero.align'] || 'center')] || alignMap.center;

  // Sombra de tarjetas
  const shadowMap = { none: 'shadow-none', sm: 'shadow', md: 'shadow-md' };
  const cardShadow = shadowMap[String(v['card.shadow'] || 'md')] || shadowMap.md;

  // Transición slideshow
  const slideshow = {
    transition: (v['slideshow.transition'] === 'slide' ? 'slide' : 'fade'),
    ms: Number(v['slideshow.ms'] || 3000)
  };

  return {
    hero: {
      cta: heroCTA,
      align: heroAlign,
      // Clases utilitarias opcionales para headings/body (si quisieras aplicarlas):
      headingFontClass: 'font-raleway',
      bodyFontClass: 'font-lato'
    },
    categoryBar: {
      item: 'py-3 inline-block',
      active: 'text-black',
      inactive: 'text-black/60 hover:text-black',
      underlineActive: 'bg-black',
      underlineInactive: 'bg-transparent'
    },
    grid: {
      // El masonry ya maneja gap desde CSS; aquí dejamos tokens listos por si luego lo parametrizamos
      gapPx: Number(v['grid.gap'] || 6)
    },
    card: {
      radiusPx: Number(v['card.radius'] || 12),
      shadow: cardShadow
    },
    viewer: {
      backdropClass: 'bg-white', // hoy viewer es claro; mantenemos compat
      filenameClass: 'px-3 py-1 rounded-md text-sm text-black/60 bg-white/70 backdrop-blur-sm'
    },
    slideshow
  };
}

// CSS variables opcionales (para hacer override visual sin prop-drilling)
function computeCssVars(template) {
  const v = template.vars || {};
  const vars = {
    '--hero-overlay': String(v['hero.overlay'] || 'rgba(0,0,0,.45)'),
    '--gallery-gap': `${Number(v['grid.gap'] || 6)}px`,
    '--card-radius': `${Number(v['card.radius'] || 12)}px`
  };
  return vars;
}

const GalleryThemeContext = createContext(null);

export function GalleryThemeProvider({ template: inputTemplate, children }) {
  const resolved = useMemo(() => resolveTemplate(inputTemplate), [inputTemplate]);

  const classes = useMemo(() => computeClasses(resolved), [resolved]);
  const cssVars = useMemo(() => computeCssVars(resolved), [resolved]);

  const value = useMemo(() => ({
    id: resolved.id,
    version: resolved.version,
    layoutVariant: resolved.layoutVariant,
    vars: resolved.vars,
    classes
  }), [resolved, classes]);

  // Nota: aún no cambiamos nada de tu UI; el wrapper sólo expone variables para cuando lo conectemos.
  return (
    <GalleryThemeContext.Provider value={value}>
      <div data-gallery-template={resolved.id} style={cssVars}>
        {children}
      </div>
    </GalleryThemeContext.Provider>
  );
}

export function useGalleryTheme() {
  const ctx = useContext(GalleryThemeContext);
  if (!ctx) {
    // Permite usar componentes incluso si el Provider no está montado (fallback a classic)
    const fallback = resolveTemplate({ id: getTemplateById('classic').id });
    return {
      id: fallback.id,
      version: fallback.version,
      layoutVariant: fallback.layoutVariant,
      vars: fallback.vars,
      classes: computeClasses(fallback)
    };
  }
  return ctx;
}
