// src/templates/tokenBridge.ts
import type { TemplateManifest, DecorSlot } from "./types";

const SLOTS: DecorSlot[] = ["topLeft", "topRight", "bottom"];

function setVar(el: HTMLElement, name: string, value?: string | number | null) {
  if (value === undefined || value === null || value === "") {
    el.style.removeProperty(name);
  } else {
    el.style.setProperty(name, String(value));
  }
}

function urlOrNone(src?: string) {
  return src ? `url("${src}")` : "none";
}

/**
 * Aplica variables CSS al contenedor del hero (.hero-surface)
 * usando los valores del manifest (con overrides para mobile).
 *
 * @param el       Contenedor raíz (ej.: <section ref={ref} class="hero-surface">)
 * @param manifest TemplateManifest cargado con loader.ts (assets ya resueltos a URLs)
 * @param isMobile true para usar los overrides mobile del manifest
 */
export function applyTemplateTokens(
  el: HTMLElement,
  manifest: TemplateManifest,
  isMobile: boolean = false
) {
  const d = manifest.defaults ?? {};

  // === Fondo y overlay (plantilla) ===
  setVar(el, "--hero-image", urlOrNone(manifest.assets?.background));
  setVar(el, "--hero-overlay", (d as any).overlay || "none");

  // === Grano (textura) ===
  // Imagen (asset)
  setVar(el, "--hero-grain-image", urlOrNone(manifest.assets?.grain));

  // Propiedades del grano desde defaults + overrides mobile (opcional)
  const baseGrain = (d as any).grain ?? {};
  const mobileGrain = (d as any)?.mobile?.grain ?? {};
  const activeGrain = isMobile ? { ...baseGrain, ...mobileGrain } : baseGrain;

  // repeat: "repeat" | "no-repeat"
  if (activeGrain.repeat !== undefined) {
    setVar(el, "--hero-grain-repeat", activeGrain.repeat);
  }
  // size: px, %, 'cover', 'contain', etc.
  if (activeGrain.size !== undefined) {
    setVar(el, "--hero-grain-size", activeGrain.size);
  }
  // blend: 'overlay' | 'soft-light' | 'multiply' | 'normal'...
  if (activeGrain.blend !== undefined) {
    setVar(el, "--hero-grain-blend", activeGrain.blend);
  }
  // opacity: 0..1
  if (activeGrain.opacity !== undefined) {
    setVar(el, "--hero-grain-opacity", activeGrain.opacity);
  }

  // === Decor (elige set móvil si existe) ===
  const baseDecor = (d as any).decor ?? {};
  const mobileDecor = (d as any)?.mobile?.decor ?? {};
  const activeDecor = isMobile ? { ...baseDecor, ...mobileDecor } : baseDecor;

  SLOTS.forEach((slot) => {
    const v = (activeDecor as any)[slot] || {};
    const assetKey = `decor${slot.charAt(0).toUpperCase() + slot.slice(1)}` as const;
    const imgUrl = (manifest.assets as any)?.[assetKey];

    // Imagen por slot
    setVar(el, `--decor-${slot}-image`, urlOrNone(imgUrl));

    // Posición/transform/visibilidad
    if (v.x !== undefined) setVar(el, `--decor-${slot}-x`, v.x);
    if (v.y !== undefined) setVar(el, `--decor-${slot}-y`, v.y);

    // Números: scale (unitless), rotate (deg), opacity (0..1)
    if (v.scale !== undefined) setVar(el, `--decor-${slot}-scale`, v.scale);
    if (v.rotate !== undefined) setVar(el, `--decor-${slot}-rotate`, `${v.rotate}deg`);
    if (v.opacity !== undefined) setVar(el, `--decor-${slot}-opacity`, v.opacity);

    // Opcional: ancho y aspect ratio
    if (v.w !== undefined) setVar(el, `--decor-${slot}-w`, v.w);
    if (v.ar !== undefined) setVar(el, `--decor-${slot}-ar`, v.ar);
  });

  // === Fuentes y colores (activado) ===
  const fonts = (d as any).fonts ?? {};
  const palette = (d as any).palette ?? {};

  // Tipografías
  if (fonts.heading !== undefined) setVar(el, "--font-family-heading", fonts.heading);
  if (fonts.body !== undefined) setVar(el, "--font-family-body", fonts.body);

  // Colores
  if (palette.bg !== undefined) setVar(el, "--color-bg", palette.bg);
  if (palette.fg !== undefined) setVar(el, "--color-fg", palette.fg);
  if (palette.accent !== undefined) setVar(el, "--color-accent", palette.accent);
}

/**
 * Limpia las variables que usa applyTemplateTokens del elemento indicado.
 * Útil si cambias de plantilla sobre el mismo nodo y quieres "resetear".
 */
export function clearTemplateTokens(el: HTMLElement) {
  const names = [
    // Fondo / overlay (plantilla)
    "--hero-image",
    "--hero-overlay",

    // Grano
    "--hero-grain-image",
    "--hero-grain-repeat",
    "--hero-grain-size",
    "--hero-grain-blend",
    "--hero-grain-opacity",

    // Decor por slot
    ...SLOTS.flatMap((slot) => [
      `--decor-${slot}-image`,
      `--decor-${slot}-x`,
      `--decor-${slot}-y`,
      `--decor-${slot}-scale`,
      `--decor-${slot}-rotate`,
      `--decor-${slot}-opacity`,
      `--decor-${slot}-w`,
      `--decor-${slot}-ar`,
    ]),

    // Fuentes y colores
    "--font-family-heading",
    "--font-family-body",
    "--color-bg",
    "--color-fg",
    "--color-accent",
  ];
  names.forEach((n) => el.style.removeProperty(n));
}
