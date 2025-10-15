import React, { createContext, useContext, useMemo } from 'react';

type Vars = Record<string, string>;

export type GalleryTemplateKey = 'classic' | 'minimal' | 'elegant';

export interface GalleryTemplate {
  key: GalleryTemplateKey;
  name: string;
  vars: Vars;        // CSS custom properties)
  meta?: {
    // espacio para descripciones, badges, etc.
    description?: string;
  };
}

const TEMPLATES: Record<GalleryTemplateKey, GalleryTemplate> = {
  classic: {
    key: 'classic',
    name: 'Clásica',
    vars: {
      'hero-overlay': 'rgba(0,0,0,.45)',
      'hero-initials-border': 'rgba(255,255,255,.55)',
      // Compat: los "chip-*" se aliasean a "cat-*" más abajo en toStyle()
      'chip-active': '#000000',
      'chip-inactive': 'rgba(0,0,0,.6)',
      'chip-underline': '#000000'
    },
    meta: { description: 'Equilibrada, elegante y universal.' }
  },
  minimal: {
    key: 'minimal',
    name: 'Minimal',
    vars: {
      'hero-overlay': 'rgba(255,255,255,.28)',
      'hero-initials-border': 'rgba(255,255,255,.75)',
      'chip-active': '#111827',
      'chip-inactive': 'rgba(17,24,39,.6)',
      'chip-underline': '#111827'
    },
    meta: { description: 'Limpia, aireada, enfoque en el contenido.' }
  },
  elegant: {
    key: 'elegant',
    name: 'Elegante',
    vars: {
      'hero-overlay': 'rgba(0,0,0,.50)',
      'hero-initials-border': 'rgba(255,255,255,.85)',
      'chip-active': '#0f172a',
      'chip-inactive': 'rgba(15,23,42,.6)',
      'chip-underline': '#0f172a'
    },
    meta: { description: 'Contraste alto y detalles refinados.' }
  }
};

const defaultTemplate = TEMPLATES.classic;

const ThemeContext = createContext<GalleryTemplate>(defaultTemplate);

export const useGalleryTheme = () => useContext(ThemeContext);

/**
 * Helper: convierte { 'chip-active': '#000' } en { '--chip-active': '#000', ... }
 * y añade ALIAS de compatibilidad hacia las variables usadas por la UI:
 *   chip-*        -> cat-*
 *   catbar-*      -> cat-*   (desde DesignSettings)
 *   grid-gap      <-> gallery-grid-gap
 *   hero-overlay  -> gallery-hero-overlay
 *   hero-initials-border -> gallery-hero-circle-border
 * Mantiene valores existentes si ya están definidos en el style inline.
 */
function toStyle(vars: Vars): React.CSSProperties {
  const style: React.CSSProperties = {};

  // Capturas para aliasing
  let chipActive: string | undefined;
  let chipInactive: string | undefined;
  let chipUnderline: string | undefined;

  let catbarItem: string | undefined;
  let catbarItemActive: string | undefined;
  let catbarUnderlineActive: string | undefined;

  let gridGap: string | undefined;
  let galleryGridGap: string | undefined;

  let heroOverlay: string | undefined;
  let heroInitialsBorder: string | undefined;

  // 1) Inyectamos todas las vars como --{k}: v
  for (const [k, v] of Object.entries(vars)) {
    (style as any)[`--${k}`] = v;

    // chip-*
    if (k === 'chip-active') chipActive = v;
    if (k === 'chip-inactive') chipInactive = v;
    if (k === 'chip-underline') chipUnderline = v;

    // catbar-*
    if (k === 'catbar-item') catbarItem = v;
    if (k === 'catbar-item-active') catbarItemActive = v;
    if (k === 'catbar-underline-active') catbarUnderlineActive = v;

    // grid gap (dos nombres posibles)
    if (k === 'grid-gap') gridGap = v;
    if (k === 'gallery-grid-gap') galleryGridGap = v;

    // hero overlay / circle border
    if (k === 'hero-overlay') heroOverlay = v;
    if (k === 'hero-initials-border') heroInitialsBorder = v;
  }

  // 2) Aliases → CategoryBar (chip-* y catbar-* hacia cat-*)
  if (chipActive && (style as any)['--cat-active'] === undefined) {
    (style as any)['--cat-active'] = chipActive;
  }
  if (chipInactive && (style as any)['--cat-inactive'] === undefined) {
    (style as any)['--cat-inactive'] = chipInactive;
  }
  if (chipUnderline && (style as any)['--cat-active-underline'] === undefined) {
    (style as any)['--cat-active-underline'] = chipUnderline;
  }

  if (catbarItem && (style as any)['--cat-inactive'] === undefined) {
    (style as any)['--cat-inactive'] = catbarItem;
  }
  if (catbarItemActive && (style as any)['--cat-active'] === undefined) {
    (style as any)['--cat-active'] = catbarItemActive;
  }
  if (catbarUnderlineActive && (style as any)['--cat-active-underline'] === undefined) {
    (style as any)['--cat-active-underline'] = catbarUnderlineActive;
  }

  // 3) Grid gap bidireccional: soportar tanto grid-gap como gallery-grid-gap
  if (gridGap && (style as any)['--gallery-grid-gap'] === undefined) {
    (style as any)['--gallery-grid-gap'] = gridGap;
  }
  if (galleryGridGap && (style as any)['--grid-gap'] === undefined) {
    (style as any)['--grid-gap'] = galleryGridGap;
  }

  // 4) Cover/Hero aliases usados por EventGallery CSS
  if (heroOverlay && (style as any)['--gallery-hero-overlay'] === undefined) {
    (style as any)['--gallery-hero-overlay'] = heroOverlay;
  }
  if (heroInitialsBorder && (style as any)['--gallery-hero-circle-border'] === undefined) {
    (style as any)['--gallery-hero-circle-border'] = heroInitialsBorder;
  }

  return style;
}

/** Aliases aceptados desde fuera (selector, query ?tpl=, etc.) */
const ALIASES: Record<string, GalleryTemplateKey> = {
  classic: 'classic',
  minimal: 'minimal',
  elegant: 'elegant',
  // alias "humanos" alineados con templates.css
  clean: 'minimal',
  overlay: 'elegant'
};

/** Mapeo para el atributo data-template que consume templates.css */
const DATA_TEMPLATE_MAP: Record<GalleryTemplateKey, 'classic' | 'clean' | 'overlay'> = {
  classic: 'classic',
  minimal: 'clean',
  elegant: 'overlay'
};

function resolveTemplateKey(input?: string | null): GalleryTemplateKey {
  if (!input) return 'classic';
  const key = String(input).toLowerCase();
  return ALIASES[key] ?? 'classic';
}

interface ProviderProps {
  // Acepta claves "canónicas" y alias humanos (clean/overlay)
  template?: string | GalleryTemplateKey | null | undefined;
  /** overrides por galería (e.g. { 'grid-gap': '8px' }) */
  overrides?: Vars | null | undefined;
  children: React.ReactNode;
}

/**
 * Provider ligero: inyecta CSS custom properties y expone el template por contexto.
 * No cambia el diseño actual: solo habilita overrides por template.
 */
export const GalleryThemeProvider: React.FC<ProviderProps> = ({ template, overrides, children }) => {
  const activeKey = resolveTemplateKey(template ?? undefined);
  const active = useMemo(() => TEMPLATES[activeKey] ?? defaultTemplate, [activeKey]);

  // data-template alineado con templates.css (classic | clean | overlay)
  const dataTemplate = DATA_TEMPLATE_MAP[active.key];

  // merge de vars del template + overrides (prioridad a overrides)
  const mergedVars = useMemo(() => ({ ...active.vars, ...(overrides ?? {}) }), [active.vars, overrides]);

  return (
    <ThemeContext.Provider value={active}>
      <div
        className="gallery-theme"
        data-template={dataTemplate}
        style={toStyle(mergedVars)}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

// (Opcional) export para paneles o el selector de templates
export const GALLERY_TEMPLATES = TEMPLATES;
