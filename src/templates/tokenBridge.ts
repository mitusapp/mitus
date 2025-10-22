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

  // Fondo y overlay
  setVar(el, "--hero-image", urlOrNone(manifest.assets?.background));
  setVar(el, "--hero-overlay", d.overlay || "none");

  // (Opcional) textura/grain — aún no la usamos en CSS, pero dejamos el token listo
  setVar(el, "--hero-grain-image", urlOrNone(manifest.assets?.grain));

  // Decor (elige set móvil si existe)
  const baseDecor = d.decor ?? ({} as any);
  const mobileDecor = d.mobile?.decor ?? ({} as any);
  const activeDecor = isMobile ? { ...baseDecor, ...mobileDecor } : baseDecor;

  SLOTS.forEach((slot) => {
    const v = (activeDecor as any)[slot] || {};
    const assetKey = `decor${slot.charAt(0).toUpperCase() + slot.slice(1)}` as const;
    const imgUrl = (manifest.assets as any)?.[assetKey];

    // Imagen por slot
    setVar(el, `--decor-${slot}-image`, urlOrNone(imgUrl));

    // Posición/transform/visibilidad
    // x, y pueden ser %, px, clamp(), calc()… (los dejamos tal cual)
    if (v.x !== undefined) setVar(el, `--decor-${slot}-x`, v.x);
    if (v.y !== undefined) setVar(el, `--decor-${slot}-y`, v.y);

    // Números: scale (unitless), rotate (deg), opacity (0..1)
    if (v.scale !== undefined) setVar(el, `--decor-${slot}-scale`, v.scale);
    if (v.rotate !== undefined) setVar(el, `--decor-${slot}-rotate`, `${v.rotate}deg`);
    if (v.opacity !== undefined) setVar(el, `--decor-${slot}-opacity`, v.opacity);

    // Soporte opcional: si algún manifest define ancho/aspect ratio
    // (no es obligatorio; tu CSS ya tiene defaults)
    if (v.w !== undefined) setVar(el, `--decor-${slot}-w`, v.w);
    if (v.ar !== undefined) setVar(el, `--decor-${slot}-ar`, v.ar);
  });

  // (Opcional futuro) fuentes/paleta — aquí solo exponemos como CSS vars si lo deseas
  // setVar(el, "--font-family-heading", d.fonts?.heading);
  // setVar(el, "--font-family-body", d.fonts?.body);
  // setVar(el, "--color-bg", d.palette?.bg);
  // setVar(el, "--color-fg", d.palette?.fg);
  // setVar(el, "--color-accent", d.palette?.accent);
}

/**
 * Limpia las variables que usa applyTemplateTokens del elemento indicado.
 * Útil si cambias de plantilla sobre el mismo nodo y quieres "resetear".
 */
export function clearTemplateTokens(el: HTMLElement) {
  const names = [
    "--hero-image",
    "--hero-overlay",
    "--hero-grain-image",
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
  ];
  names.forEach((n) => el.style.removeProperty(n));
}
