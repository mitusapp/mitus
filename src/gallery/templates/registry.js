// src/gallery/templates/registry.js

// Catálogo inicial de plantillas (puedes añadir más luego)
export const GALLERY_TEMPLATES = {
  classic: {
    id: 'classic',
    version: 1,
    label: 'Classic',
    thumb: '/templates/hero/classic.jpg', // opcional (miniatura para Settings)
    layoutVariant: 'classic',
    defaults: {
      'hero.align': 'center',             // center | left | right
      'hero.overlay': 'rgba(0,0,0,.45)',
      'hero.initials': true,              // círculo con iniciales
      'hero.cta': 'glass',                // glass | solid | outline
      'fonts.heading': 'Raleway',
      'fonts.body': 'Lato',
      'grid.gap': 6,                      // px
      'card.radius': 12,                  // px
      'card.shadow': 'md',                // none | sm | md
      'viewer.bg': 'white/100',
      'slideshow.transition': 'fade',     // fade | slide
      'slideshow.ms': 3000
    }
  },

  minimal: {
    id: 'minimal',
    version: 1,
    label: 'Minimal',
    thumb: '/templates/hero/minimal.jpg',
    layoutVariant: 'minimal',
    defaults: {
      'hero.align': 'left',
      'hero.overlay': 'rgba(0,0,0,.25)',
      'hero.initials': false,
      'hero.cta': 'outline',
      'fonts.heading': 'Raleway',
      'fonts.body': 'Lato',
      'grid.gap': 6,
      'card.radius': 8,
      'card.shadow': 'sm',
      'viewer.bg': 'white/100',
      'slideshow.transition': 'fade',
      'slideshow.ms': 3500
    }
  },

  glass: {
    id: 'glass',
    version: 1,
    label: 'Glass',
    thumb: '/templates/hero/glass.jpg',
    layoutVariant: 'glass',
    defaults: {
      'hero.align': 'center',
      'hero.overlay': 'rgba(0,0,0,.35)',
      'hero.initials': true,
      'hero.cta': 'glass',
      'fonts.heading': 'Raleway',
      'fonts.body': 'Lato',
      'grid.gap': 6,
      'card.radius': 14,
      'card.shadow': 'md',
      'viewer.bg': 'white/100',
      'slideshow.transition': 'fade',
      'slideshow.ms': 3000
    }
  },

  split: {
    id: 'split',
    version: 1,
    label: 'Split',
    thumb: '/templates/hero/split.jpg',
    layoutVariant: 'split', // imagen + columna info/CTAs
    defaults: {
      'hero.align': 'left',
      'hero.overlay': 'rgba(0,0,0,.30)',
      'hero.initials': true,
      'hero.cta': 'solid',
      'fonts.heading': 'Raleway',
      'fonts.body': 'Lato',
      'grid.gap': 6,
      'card.radius': 12,
      'card.shadow': 'md',
      'viewer.bg': 'white/100',
      'slideshow.transition': 'slide',
      'slideshow.ms': 3000
    }
  }
};

// Utilidades
export const getTemplateById = (id) => GALLERY_TEMPLATES[id] || GALLERY_TEMPLATES.classic;

// Mezcla defaults de la plantilla con overrides del evento
export function resolveTemplate(themeInput) {
  const input = themeInput || {};
  const base = getTemplateById(input.id || 'classic');
  const version = Number(input.version || base.version || 1);

  // mezcla NO destructiva
  const vars = { ...(base.defaults || {}), ...((input.vars || {})) };

  return {
    id: base.id,
    version,
    layoutVariant: base.layoutVariant || 'classic',
    vars,
    meta: { label: base.label, thumb: base.thumb }
  };
}
