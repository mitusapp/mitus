// src/templates/loader.ts
import type { TemplateManifest } from "./types";

/**
 * Carga todos los manifest.json de /src/templates/** de forma estática (en build)
 * y mapea sus assets declarados (bg.webp, decor-*.png, grain.png) a URLs servidas por Vite.
 */

// JSON de cada pack (eager = en build; perfecto para descubrir plantillas)
const manifestFiles = import.meta.glob("./**/manifest.json", {
  eager: true
}) as Record<string, { default: TemplateManifest } | TemplateManifest>;

// Todos los archivos dentro de assets/ como URLs (string)
const assetFiles = import.meta.glob("./**/assets/*", {
  eager: true,
  import: "default"
}) as Record<string, string>;

// (Opcional) Previews para UI de selección (png/jpg/webp/svg)
const previewFiles = import.meta.glob("./**/preview.{png,jpg,jpeg,webp,svg}", {
  eager: true,
  import: "default"
}) as Record<string, string>;

/** Dado un path relativo declarado en el manifest (ej: "bg.webp"), lo resuelve a URL real. */
function resolveAsset(pathFromManifest: string, manifestPath: string) {
  // ./eucalyptus-watercolor/manifest.json  →  ./eucalyptus-watercolor/assets/
  const base = manifestPath.replace(/manifest\.json$/i, "assets/");
  // Buscamos el asset cuyo path empiece por esa base y termine en el nombre esperado
  const key = Object.keys(assetFiles).find(
    (k) => k.startsWith(base) && k.endsWith(pathFromManifest)
  );
  return key ? assetFiles[key] : undefined;
}

/** (Opcional) Busca la preview.* junto al manifest */
function resolvePreview(manifestPath: string) {
  const folder = manifestPath.replace(/manifest\.json$/i, "");
  const entry = Object.entries(previewFiles).find(([k]) => k.startsWith(folder));
  return entry?.[1];
}

/** Devuelve todos los manifests (con assets ya resueltos a URLs) */
export function getAllTemplates(): TemplateManifest[] {
  return Object.entries(manifestFiles).map(([manifestPath, mod]) => {
    const raw = (mod as any).default ?? mod; // soporta ambos tipos por seguridad
    const manifest: TemplateManifest = structuredClone(raw);

    // Resolver assets declarados a URLs de Vite
    for (const [k, v] of Object.entries(manifest.assets || {})) {
      if (typeof v === "string") {
        (manifest.assets as any)[k] = resolveAsset(v, manifestPath);
      }
    }

    // (Opcional) Guardar preview como "asset virtual" si quieres
    const previewUrl = resolvePreview(manifestPath);
    if (previewUrl) {
      (manifest as any).preview = previewUrl; // no tipado, solo conveniencia para UI
    }

    return manifest;
  });
}

/** Carga un template por key (ya resuelto) o null si no existe */
export function loadTemplate(key: string): TemplateManifest | null {
  const entry = Object.entries(manifestFiles).find(
    ([, mod]) => ((mod as any).default ?? mod).key === key
  );
  if (!entry) return null;

  const [manifestPath, mod] = entry;
  const raw = (mod as any).default ?? mod;
  const manifest: TemplateManifest = structuredClone(raw);

  // Resolver assets a URLs
  for (const [k, v] of Object.entries(manifest.assets || {})) {
    if (typeof v === "string") {
      (manifest.assets as any)[k] = resolveAsset(v, manifestPath);
    }
  }
  const previewUrl = resolvePreview(manifestPath);
  if (previewUrl) (manifest as any).preview = previewUrl;

  return manifest;
}
