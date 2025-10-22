// src/templates/types.ts
export type DecorSlot = "topLeft" | "topRight" | "bottom";

export type TemplateAssets = {
  /** Fondo de la portada — usar WEBP/AVIF si es posible */
  background?: string;
  /** Textura/grain opcional */
  grain?: string;
  /** PNGs con transparencia para slots decorativos */
  decorTopLeft?: string;
  decorTopRight?: string;
  decorBottom?: string;
};

export type DecorValues = {
  x: string;          // ej: "24px" | "50%" | "clamp(12px,3vw,36px)"
  y: string;          // ej: "16px" | "calc(100% - 24px)"
  scale?: number;     // ej: 0.9 | 1
  rotate?: number;    // en grados, ej: 0 | 8
  opacity?: number;   // 0..1
};

export interface TemplateManifest {
  /** Clave única del template (coincide con la carpeta) */
  key: string;
  /** Nombre visible */
  name: string;
  version: number;

  /** Archivos declarados en manifest → se resolverán a URLs por el loader */
  assets: TemplateAssets;

  /** Valores por defecto de la plantilla */
  defaults: {
    fonts?: { heading?: string; body?: string };
    palette?: { bg?: string; fg?: string; accent?: string };
    /** CSS válido para overlay (gradiente/velo) */
    overlay?: string;

    /** Posiciones/transform de decor para desktop */
    decor?: Record<DecorSlot, DecorValues>;

    /** Overrides para mobile */
    mobile?: {
      decor?: Record<DecorSlot, DecorValues>;
    };

    /** Metadatos de animación (para Framer) */
    animation?: {
      sequence?: ("bg" | "decorTopLeft" | "decorTopRight" | "decorBottom" | "content")[];
      durationMs?: number;
      easing?: "easeOut" | "easeInOut" | "linear";
      parallax?: { enabled: boolean; strength: number };
    };
  };
}
