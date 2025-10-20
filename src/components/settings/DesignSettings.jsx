// src/components/settings/DesignSettings.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Panel de "Design Settings" por galería (Fase 3).
 * - Edita variables CSS (overrides) sin cambiar la plantilla base.
 * - NO persiste por sí solo; el padre (EventSettings) decide guardar.
 *
 * Props:
 *  - value?: Record<string,string>   // overrides actuales (e.g. { 'grid-gap': '8px' })
 *  - onChange?: (next: Record<string,string>) => void // emitir cambios
 *  - eventId?: string // (opcional) para abrir /event/:id en "Probar en vivo"
 */
const DesignSettings = ({ value = {}, onChange, eventId }) => {
  // Estado local editable; iniciamos con los overrides entrantes
  const [form, setForm] = useState(value);

  useEffect(() => {
    setForm(value || {});
  }, [value]);

  // ========= Utils =========
  const emit = (next) => {
    setForm(next);
    if (onChange) onChange(next);
  };

  const setKey = (k, v) => emit({ ...form, [k]: v });
  const delKeys = (keys) => {
    const next = { ...form };
    keys.forEach((k) => { delete next[k]; });
    emit(next);
  };
  const resetAll = () => emit({});

  // Hex (#rrggbb) + alpha [0..1] -> rgba(r,g,b,a)
  const rgba = (hex, a) => {
    if (!hex) return '';
    const m = hex.replace('#', '');
    const r = parseInt(m.substring(0, 2), 16) || 0;
    const g = parseInt(m.substring(2, 4), 16) || 0;
    const b = parseInt(m.substring(4, 6), 16) || 0;
    const alpha = Math.max(0, Math.min(1, Number(a ?? 1)));
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // Extrae alpha (0..100) desde rgba(...) si existe
  const alphaFromRgba = (val, fallbackPct = 45) => {
    if (typeof val !== 'string') return fallbackPct;
    const m = val.match(/rgba?\([^,]+,[^,]+,[^,]+,([\d.]+)\)/i);
    return m ? Math.round(parseFloat(m[1]) * 100) : fallbackPct;
  };

  // ========= COVER =========
  const coverColor = useMemo(() => '#000000', []);
  const coverAlpha = useMemo(() => alphaFromRgba(form['hero-overlay'], 45), [form['hero-overlay']]);

  const handleCoverColor = (hex) => {
    const next = rgba(hex, (coverAlpha ?? 45) / 100);
    setKey('hero-overlay', next);
  };
  const handleCoverAlpha = (pct) => {
    const alpha = Math.max(0, Math.min(100, Number(pct))) / 100;
    const hex = coverColor;
    setKey('hero-overlay', rgba(hex, alpha));
  };

  // Desenfoque de la imagen de portada (hero-image-filter: blur(Npx))
  const heroBlurPx = (() => {
    const raw = form['hero-image-filter'] || 'blur(6px)';
    const m = String(raw).match(/blur\((\d+)\s*px\)/i);
    const n = m ? parseInt(m[1], 10) : 6;
    return Number.isFinite(n) ? n : 6;
  })();
  const handleHeroBlurPx = (px) => {
    const v = Math.max(0, Math.min(40, parseInt(px, 10) || 0));
    setKey('hero-image-filter', `blur(${v}px)`);
  };

  // ========= COLOR (CategoryBar) =========
  const catInactive = form['catbar-item'] ?? '';
  const catActive = form['catbar-item-active'] ?? '';
  const catUnderline = form['catbar-underline-active'] ?? '';

  // ========= GRID =========
  const gridGap = form['grid-gap'] ?? '';
  const gridColsM = form['grid-cols-mobile'] ?? '';
  const gridColsD = form['grid-cols-desktop'] ?? '';

  // ========= TYPOGRAPHY =========
  const fontSizeBasePx = (() => {
    const raw = form['font-size-base'];
    const n = parseInt(String(raw || '').replace('px', ''), 10);
    return Number.isFinite(n) ? n : 16;
  })();
  const fontFamilyBase = form['font-family-base'] || "'Lato', sans-serif";
  const fontFamilyTitle = form['font-family-title'] || '';
  const fontFamilySubtitle = form['font-family-subtitle'] || '';

  // ========= PALETAS (global – para futuras secciones) =========
  const paletteAccent = form['color-accent'] || '#9E7977';
  const paletteText = form['color-fg'] || '#1E1E1E';
  const paletteBg = form['color-bg'] || '#FFFFFF';
  const paletteMuted = form['color-muted'] || '#5E5E5E';

  const applyPalettePreset = (preset) => {
    if (preset === 'light') {
      emit({
        ...form,
        'color-bg': '#FFFFFF',
        'color-fg': '#1E1E1E',
        'color-muted': '#5E5E5E',
        'color-accent': '#9E7977',
      });
    } else if (preset === 'dark') {
      emit({
        ...form,
        'color-bg': '#0f0f10',
        'color-fg': '#f5f5f7',
        'color-muted': '#b5b5b8',
        'color-accent': '#9E7977',
      });
    } else if (preset === 'sepia') {
      emit({
        ...form,
        'color-bg': '#F6F0E8',
        'color-fg': '#2B2A28',
        'color-muted': '#6F6A65',
        'color-accent': '#8A6A58',
      });
    }
  };

  // ========= TOPBAR (barra inferior del hero) =========
  const topbarBgAlpha = useMemo(() => alphaFromRgba(form['topbar-bg'], 85), [form['topbar-bg']]);
  const handleTopbarBgColor = (hex) => setKey('topbar-bg', rgba(hex, (topbarBgAlpha ?? 85) / 100));
  const handleTopbarBgAlpha = (pct) => setKey('topbar-bg', rgba('#ffffff', Math.max(0, Math.min(100, Number(pct))) / 100));
  const blurPx = (() => {
    const raw = form['topbar-blur'] || 'blur(8px)';
    const m = raw.match(/blur\((\d+)px\)/i);
    const n = m ? parseInt(m[1], 10) : 8;
    return Number.isFinite(n) ? n : 8;
  })();
  const handleBlurPx = (px) => setKey('topbar-blur', `blur(${Math.max(0, parseInt(px, 10) || 0)}px)`);

  // ========= SET FOCAL (hero imagen) =========
  const focalX = (() => {
    const raw = String(form['hero-focal-x'] || '50%');
    const n = parseInt(raw.replace('%', ''), 10);
    return Number.isFinite(n) ? n : 50;
  })();
  const focalY = (() => {
    const raw = String(form['hero-focal-y'] || '50%');
    const n = parseInt(raw.replace('%', ''), 10);
    return Number.isFinite(n) ? n : 50;
  })();

  // ========= TÍTULO/NOMBRES EN PORTADA =========
  const titleX = (() => {
    const raw = String(form['hero-title-x'] || '50%');
    const n = parseInt(raw.replace('%', ''), 10);
    return Number.isFinite(n) ? n : 50;
  })();
  const titleY = (() => {
    const raw = String(form['hero-title-y'] || '50%');
    const n = parseInt(raw.replace('%', ''), 10);
    return Number.isFinite(n) ? n : 50;
  })();
  const headingMode = form['hero-heading-mode'] || 'initials';

  // ➕ Tamaño del título (px) — controla --hero-title-size
  const heroTitleSizePx = (() => {
    const raw = form['hero-title-size'];
    // Si no hay override, usamos un valor cómodo por defecto para UI
    const m = String(raw || '').match(/(\d+)\s*px/i);
    const n = m ? parseInt(m[1], 10) : 48;
    return Number.isFinite(n) ? n : 48;
  })();

  const subtitleX = (() => {
    const raw = String(form['hero-subtitle-x'] || '50%');
    const n = parseInt(raw.replace('%', ''), 10);
    return Number.isFinite(n) ? n : 50;
  })();
  const subtitleY = (() => {
    const raw = String(form['hero-subtitle-y'] || '58%'); // 8% debajo del 50% por defecto
    const n = parseInt(raw.replace('%', ''), 10);
    return Number.isFinite(n) ? n : 58;
  })();
  const heroSubtitleSizePx = (() => {
    const raw = form['hero-subtitle-size'];
    const m = String(raw || '').match(/(\d+)\s*px/i);
    const n = m ? parseInt(m[1], 10) : 22;
    return Number.isFinite(n) ? n : 22;
  })();


  // ========= DECORACIÓN (Hero) =========
  // Helpers
  const pxNum = (v, d = 0) => {
    const n = parseInt(String(v || '').replace('px', ''), 10);
    return Number.isFinite(n) ? n : d;
  };
  const pctNum = (v, d = 100) => {
    const n = parseInt(String(v || '').replace('%', ''), 10);
    return Number.isFinite(n) ? n : d;
  };

  // Valores actuales con fallback
  const decorDisplay = (form['hero-decor-display'] || 'none').trim();
  const decorInsetPx = pxNum(form['hero-decor-inset'], 24);
  const decorBorderPx = pxNum(form['hero-decor-border-width'], 2);
  const decorRadiusPx = pxNum(form['hero-decor-radius'], 0);
  const decorOpacityPct = Math.round((parseFloat(form['hero-decor-opacity'] ?? '1') || 1) * 100);
  const decorTextureOpacityPct = Math.round((parseFloat(form['hero-decor-texture-opacity'] ?? '.25') || 0.25) * 100);
  const decorTexture = form['hero-decor-texture'] || '';
  const decorOffsetX = pctNum(form['hero-decor-offset-x'], 0);
  const decorOffsetY = pctNum(form['hero-decor-offset-y'], 0);
  const decorRotationDeg = pxNum(form['hero-decor-rotation'], 0); // guardamos como "NN" y lo formateamos a "NNdeg" al setear

  // Deducción de preset básico para la UI (best-effort)
  const deduceDecorPreset = () => {
    if (decorDisplay === 'none') return 'none';
    // Heurísticas simples en base a tokens
    if ((form['hero-decor-radius'] || '').includes('28')) return 'frame-rounded';
    if ((form['hero-decor-border-width'] || '').includes('2') && (form['hero-decor-radius'] || '0') === '8px') return 'frame-thin';
    if (decorTexture && decorBorderPx === 0) return 'grain';
    return 'custom';
  };
  const decorPreset = deduceDecorPreset();

  const applyDecorPreset = (preset) => {
    if (preset === 'none') {
      emit({
        ...form,
        'hero-decor-display': 'none',
      });
      return;
    }

    if (preset === 'frame-thin') {
      emit({
        ...form,
        'hero-decor-display': 'block',
        'hero-decor-inset': '24px',
        'hero-decor-border-width': '2px',
        'hero-decor-border-color': 'rgba(255,255,255,.85)',
        'hero-decor-radius': '8px',
        'hero-decor-shadow': '0 0 0 1px rgba(0,0,0,.06), 0 6px 24px rgba(0,0,0,.18)',
        'hero-decor-texture': 'none',
        'hero-decor-opacity': '1',
      });
      return;
    }

    if (preset === 'frame-rounded') {
      emit({
        ...form,
        'hero-decor-display': 'block',
        'hero-decor-inset': '28px',
        'hero-decor-border-width': '3px',
        'hero-decor-border-color': 'rgba(255,255,255,.90)',
        'hero-decor-radius': '28px',
        'hero-decor-shadow': '0 0 0 1px rgba(255,255,255,.25), 0 8px 30px rgba(0,0,0,.22)',
        'hero-decor-texture': 'none',
        'hero-decor-opacity': '1',
      });
      return;
    }

    if (preset === 'grain') {
      emit({
        ...form,
        'hero-decor-display': 'block',
        'hero-decor-inset': '0px',
        'hero-decor-border-width': '0px',
        'hero-decor-border-color': 'transparent',
        'hero-decor-radius': '0px',
        'hero-decor-shadow': 'none',
        'hero-decor-texture':
          'repeating-radial-gradient(circle at 10% 20%, rgba(255,255,255,.06) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgba(0,0,0,.06) 0 1px, transparent 1px 3px)',
        'hero-decor-texture-opacity': '.22',
        'hero-decor-texture-blend': 'overlay',
        'hero-decor-opacity': '1',
      });
      return;
    }

    // custom -> no hace nada especial; dejamos que el usuario ajuste manualmente
  };

  const handleDecorUrl = (url) => {
    const clean = String(url || '').trim();
    if (!clean) {
      delKeys(['hero-decor-texture']);
      return;
    }
    emit({
      ...form,
      'hero-decor-display': 'block',
      'hero-decor-texture': `url("${clean}") center/cover no-repeat`,
    });
  };

  // ========= PREVIEW (?tpl=draft&d=...) =========
  const encodeOverridesB64Url = (obj) => {
    try {
      const json = JSON.stringify(obj || {});
      const b64 = typeof window !== 'undefined'
        ? window.btoa(unescape(encodeURIComponent(json)))
        : Buffer.from(json, 'utf8').toString('base64');
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    } catch {
      return '';
    }
  };
  const inferEventId = () => {
    if (eventId) return eventId;
    try {
      const p = window.location.pathname;
      const m = p.match(/\/host\/([^/]+)/) || p.match(/\/event\/([^/]+)/);
      return m ? m[1] : '';
    } catch { return ''; }
  };
  const openLivePreview = () => {
    const id = inferEventId();
    const d = encodeOverridesB64Url(form);
    const url = id ? `/event/${id}?tpl=draft&d=${d}` : `/event/preview?tpl=draft&d=${d}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      {/* ACCIONES: Preview / Reset All */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold text-[#2D2D2D]">Vista previa en vivo</h3>
            <p className="text-xs text-[#5E5E5E]">
              Abre la galería con <code>?tpl=draft</code> y tus overrides actuales (sin guardar).
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={openLivePreview} className="bg-[#9E7977] hover:bg-[#8a6866] text-white">
              Probar en vivo
            </Button>
            <Button type="button" variant="outline" className="border-[#E6E3E0] text-[#2D2D2D]" onClick={resetAll}>
              Restaurar todo
            </Button>
          </div>
        </div>
      </section>

      {/* COVER */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Cover (Hero Overlay)</h3>

        {/* NUEVO: Modo de encabezado en portada */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mb-4">
          <div className="sm:col-span-3">
            <label className="block text-xs text-[#5E5E5E] mb-1">Mostrar en portada</label>
            <select
              className="w-full p-2 border rounded-md text-[#2D2D2D] bg-white"
              value={headingMode}
              onChange={(e) => setKey('hero-heading-mode', e.target.value)}
            >
              <option value="initials">Iniciales (círculo)</option>
              <option value="names">Nombres (texto)</option>
            </select>
          </div>
        </div>

        {/* Color/alpha/valor avanzado */}
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Color base</label>
            <input
              type="color"
              defaultValue="#000000"
              className="h-10 w-16 p-1 rounded-md border bg-white"
              onChange={(e) => handleCoverColor(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Opacidad</label>
            <input
              type="range"
              min={0}
              max={100}
              value={coverAlpha}
              onChange={(e) => handleCoverAlpha(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{coverAlpha}%</div>
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Valor avanzado (texto)</label>
            <input
              type="text"
              placeholder="rgba(0,0,0,.45) o linear-gradient(...)"
              value={form['hero-overlay'] ?? ''}
              onChange={(e) => setKey('hero-overlay', e.target.value)}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
            />
          </div>
        </div>

        {/* Desenfoque de imagen */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-[#5E5E5E] mb-1">Desenfoque de imagen (px)</label>
            <input
              type="range"
              min={0}
              max={40}
              value={heroBlurPx}
              onChange={(e) => handleHeroBlurPx(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{heroBlurPx}px</div>
          </div>
        </div>

        {/* Posición de Nombres en portada */}
        <div className="grid sm:grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Posición título X (%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={titleX}
              onChange={(e) => setKey('hero-title-x', `${parseInt(e.target.value, 10)}%`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{titleX}%</div>
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Posición título Y (%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={titleY}
              onChange={(e) => setKey('hero-title-y', `${parseInt(e.target.value, 10)}%`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{titleY}%</div>
          </div>
        </div>

        {/* ➕ Tamaño del título (px) */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
          <div className="sm:col-span-2">
            <label className="block text-xs text-[#5E5E5E] mb-1">Tamaño del título (px)</label>
            <input
              type="range"
              min={20}
              max={120}
              value={heroTitleSizePx}
              onChange={(e) => setKey('hero-title-size', `${parseInt(e.target.value, 10)}px`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{heroTitleSizePx}px</div>
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Valor manual</label>
            <input
              type="text"
              placeholder="p.ej. 56px"
              value={form['hero-title-size'] || `${heroTitleSizePx}px`}
              onChange={(e) => setKey('hero-title-size', e.target.value)}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
            />
          </div>
        </div>

        {/* Subtítulo (tipo de evento) */}
        <div className="mt-6">
          <h4 className="font-medium text-[#2D2D2D] mb-2">Subtítulo (tipo de evento)</h4>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-[#5E5E5E] mb-1">Posición subtítulo X (%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={subtitleX}
                onChange={(e) => setKey('hero-subtitle-x', `${parseInt(e.target.value, 10)}%`)}
                className="w-full"
              />
              <div className="text-xs text-[#5E5E5E]">{subtitleX}%</div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5E5E] mb-1">Posición subtítulo Y (%)</label>
              <input
                type="range"
                min={0}
                max={100}
                value={subtitleY}
                onChange={(e) => setKey('hero-subtitle-y', `${parseInt(e.target.value, 10)}%`)}
                className="w-full"
              />
              <div className="text-xs text-[#5E5E5E]">{subtitleY}%</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#5E5E5E] mb-1">Tamaño del subtítulo (px)</label>
              <input
                type="range"
                min={12}
                max={64}
                value={heroSubtitleSizePx}
                onChange={(e) => setKey('hero-subtitle-size', `${parseInt(e.target.value, 10)}px`)}
                className="w-full"
              />
              <div className="text-xs text-[#5E5E5E]">{heroSubtitleSizePx}px</div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5E5E] mb-1">Color</label>
              <input
                type="color"
                value={form['hero-subtitle-color'] || '#ffffff'}
                onChange={(e) => setKey('hero-subtitle-color', e.target.value)}
                className="h-10 w-16 p-1 rounded-md border bg-white"
              />
            </div>
          </div>
        </div>


        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['hero-overlay', 'hero-image-filter', 'hero-heading-mode', 'hero-title-x', 'hero-title-y', 'hero-title-size', 'hero-subtitle-x', 'hero-subtitle-y', 'hero-subtitle-size', 'hero-subtitle-color'])}
          >
            Restaurar Cover
          </Button>
        </div>
      </section>

      {/* DECORACIÓN (Hero) */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Decoración (Hero)</h3>

        {/* Presets */}
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-3">
            <label className="block text-xs text-[#5E5E5E] mb-1">Preset</label>
            <select
              className="w-full p-2 border rounded-md text-[#2D2D2D] bg-white"
              value={decorPreset}
              onChange={(e) => applyDecorPreset(e.target.value)}
            >
              <option value="none">Ninguno</option>
              <option value="frame-thin">Marco fino</option>
              <option value="frame-rounded">Marco redondeado</option>
              <option value="grain">Textura “grain”</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </div>

        {/* URL rápida para textura/PNG/SVG */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
          <div className="sm:col-span-3">
            <label className="block text-xs text-[#5E5E5E] mb-1">URL de PNG/SVG (superpuesto)</label>
            <input
              type="url"
              placeholder="https://.../mi-textura.svg o .png"
              defaultValue={decorTexture.startsWith('url(') ? (decorTexture.match(/url\("?(.*?)"?\)/)?.[1] || '') : ''}
              onBlur={(e) => handleDecorUrl(e.target.value)}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
            />
            <p className="text-xs text-[#5E5E5E] mt-1">Se aplica como textura en la capa decorativa.</p>
          </div>
        </div>

        {/* Sliders básicos */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Opacidad marco (%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={decorOpacityPct}
              onChange={(e) => setKey('hero-decor-opacity', String(Math.max(0, Math.min(100, parseInt(e.target.value, 10))) / 100))}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorOpacityPct}%</div>
          </div>

          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Grosor borde (px)</label>
            <input
              type="range"
              min={0}
              max={16}
              value={decorBorderPx}
              onChange={(e) => setKey('hero-decor-border-width', `${Math.max(0, parseInt(e.target.value, 10) || 0)}px`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorBorderPx}px</div>
          </div>

          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Margen (inset, px)</label>
            <input
              type="range"
              min={0}
              max={64}
              value={decorInsetPx}
              onChange={(e) => setKey('hero-decor-inset', `${Math.max(0, parseInt(e.target.value, 10) || 0)}px`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorInsetPx}px</div>
          </div>
        </div>

        {/* Radio de esquinas */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Radio de esquinas (px)</label>
            <input
              type="range"
              min={0}
              max={64}
              value={decorRadiusPx}
              onChange={(e) => setKey('hero-decor-radius', `${Math.max(0, parseInt(e.target.value, 10) || 0)}px`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorRadiusPx}px</div>
          </div>
          <div />
          <div />
        </div>

        {/* Textura: opacidad + rotación (best-effort) */}
        <div className="grid sm:grid-cols-3 gap-4 items-end mt-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Opacidad textura (%)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={decorTextureOpacityPct}
              onChange={(e) => setKey('hero-decor-texture-opacity', String(Math.max(0, Math.min(100, parseInt(e.target.value, 10))) / 100))}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorTextureOpacityPct}%</div>
          </div>

          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Rotación (°)</label>
            <input
              type="range"
              min={-180}
              max={180}
              value={decorRotationDeg}
              onChange={(e) => setKey('hero-decor-rotation', `${parseInt(e.target.value, 10) || 0}`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorRotationDeg}°</div>
          </div>

          <div />
        </div>

        {/* Posición (offsets relativos) */}
        <div className="grid sm:grid-cols-2 gap-6 mt-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Desplazamiento X (%)</label>
            <input
              type="range"
              min={-20}
              max={20}
              value={decorOffsetX}
              onChange={(e) => setKey('hero-decor-offset-x', `${parseInt(e.target.value, 10)}%`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorOffsetX}%</div>
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Desplazamiento Y (%)</label>
            <input
              type="range"
              min={-20}
              max={20}
              value={decorOffsetY}
              onChange={(e) => setKey('hero-decor-offset-y', `${parseInt(e.target.value, 10)}%`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{decorOffsetY}%</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys([
              'hero-decor-display',
              'hero-decor-inset',
              'hero-decor-border-width',
              'hero-decor-border-color',
              'hero-decor-radius',
              'hero-decor-shadow',
              'hero-decor-opacity',
              'hero-decor-texture',
              'hero-decor-texture-opacity',
              'hero-decor-texture-blend',
              'hero-decor-offset-x',
              'hero-decor-offset-y',
              'hero-decor-rotation'
            ])}
          >
            Restaurar Decoración
          </Button>
        </div>
      </section>

      {/* TOPBAR */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Topbar (barra inferior del hero)</h3>

        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Fondo</label>
            <input
              type="color"
              defaultValue="#FFFFFF"
              className="h-10 w-16 p-1 rounded-md border bg-white"
              onChange={(e) => handleTopbarBgColor(e.target.value)}
            />
            <div className="mt-2">
              <label className="block text-xs text-[#5E5E5E] mb-1">Opacidad</label>
              <input
                type="range"
                min={0}
                max={100}
                value={topbarBgAlpha}
                onChange={(e) => handleTopbarBgAlpha(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Borde (rgba)</label>
            <input
              type="text"
              placeholder="rgba(0,0,0,.10)"
              value={form['topbar-border'] || ''}
              onChange={(e) => setKey('topbar-border', e.target.value)}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
            />
          </div>

          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Blur (px)</label>
            <input
              type="range"
              min={0}
              max={20}
              value={blurPx}
              onChange={(e) => handleBlurPx(e.target.value)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{blurPx}px</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Título</label>
            <input
              type="color"
              value={form['topbar-title'] || '#000000'}
              onChange={(e) => setKey('topbar-title', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Subtítulo</label>
            <input
              type="color"
              value={form['topbar-subtitle'] || '#666666'}
              onChange={(e) => setKey('topbar-subtitle', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Iconos</label>
            <input
              type="color"
              value={form['topbar-icon'] || '#000000'}
              onChange={(e) => setKey('topbar-icon', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Fondo icono</label>
            <input
              type="color"
              value={form['topbar-icon-bg'] || '#00000000'}
              onChange={(e) => setKey('topbar-icon-bg', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['topbar-bg', 'topbar-border', 'topbar-blur', 'topbar-title', 'topbar-subtitle', 'topbar-icon', 'topbar-icon-bg'])}
          >
            Restaurar Topbar
          </Button>
        </div>
      </section>

      {/* COLOR - CategoryBar */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Colores de CategoryBar</h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Texto inactivo</label>
            <input
              type="color"
              value={catInactive || '#666666'}
              onChange={(e) => setKey('catbar-item', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Texto activo</label>
            <input
              type="color"
              value={catActive || '#111111'}
              onChange={(e) => setKey('catbar-item-active', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Subrayado activo</label>
            <input
              type="color"
              value={catUnderline || '#111111'}
              onChange={(e) => setKey('catbar-underline-active', e.target.value)}
              className="h-10 w-16 p-1 rounded-md border bg-white"
            />
          </div>
        </div>

        {/* Preview simple del chip */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-[#5E5E5E]">Vista previa:</span>
          <div className="flex gap-6">
            <div className="relative">
              <span
                className="text-sm"
                style={{ color: catInactive || 'rgba(0,0,0,.60)' }}
              >
                INACTIVO
              </span>
            </div>
            <div className="relative">
              <span
                className="text-sm"
                style={{ color: catActive || '#000' }}
              >
                ACTIVO
              </span>
              <span
                className="block h-[2px] mt-1"
                style={{ background: catUnderline || (catActive || '#000'), width: 48 }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['catbar-item', 'catbar-item-active', 'catbar-underline-active'])}
          >
            Restaurar CategoryBar
          </Button>
        </div>
      </section>

      {/* TYPOGRAPHY */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Typography</h3>

        {/* Base (UI / cuerpo) */}
        <div className="grid sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Tamaño base (px)</label>
            <input
              type="number"
              min={12}
              max={22}
              value={fontSizeBasePx}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                setKey('font-size-base', `${n}px`);
              }}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              placeholder="16"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs text-[#5E5E5E] mb-1">Fuente base</label>
            <select
              className="w-full p-2 border rounded-md text-[#2D2D2D] bg-white"
              value={fontFamilyBase}
              onChange={(e) => setKey('font-family-base', e.target.value)}
            >
              <option value="'Lato', sans-serif">Lato</option>
              <option value="'Raleway', sans-serif">Raleway</option>
              <option value="'Inter', system-ui, -apple-system, Segoe UI, Roboto, sans-serif">Inter</option>
              <option value="'Montserrat', sans-serif">Montserrat</option>
              <option value="'DM Sans', sans-serif">DM Sans</option>
              <option value="'Manrope', sans-serif">Manrope</option>
              <option value="'Source Sans 3', sans-serif">Source Sans 3</option>
              <option value={fontFamilyBase}>— mantener actual —</option>
            </select>
            <div className="mt-2">
              <label className="block text-xs text-[#5E5E5E] mb-1">Personalizada</label>
              <input
                type="text"
                value={fontFamilyBase}
                onChange={(e) => setKey('font-family-base', e.target.value)}
                placeholder="'Lato', sans-serif"
                className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              />
            </div>
          </div>
        </div>

        {/* Título (Hero) */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-3">
            <label className="block text-xs text-[#5E5E5E] mb-1">Fuente de título (Hero)</label>
            <select
              className="w-full p-2 border rounded-md text-[#2D2D2D] bg-white"
              value={fontFamilyTitle}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  // Hereda la base → eliminamos el override
                  delKeys(['font-family-title']);
                } else {
                  setKey('font-family-title', v);
                }
              }}
            >
              {/* Opción “heredar base” (vacía) */}
              <option value="">— heredar base —</option>

              {/* Editorial / fine-art (serif display) */}
              <option value="'Playfair Display', serif">Playfair Display</option>
              <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
              <option value="'EB Garamond', serif">EB Garamond</option>
              <option value="'DM Serif Display', serif">DM Serif Display</option>
              <option value="'Libre Bodoni', serif">Libre Bodoni</option>
              <option value="'Gilda Display', serif">Gilda Display</option>
              <option value="'Prata', serif">Prata</option>
              <option value="'Bodoni Moda', serif">Bodoni Moda</option>
              <option value="'Gloock', serif">Gloock</option>
              <option value="'Cormorant Infant', serif">Cormorant Infant</option>
              <option value="'Libre Caslon Display', serif">Libre Caslon Display</option>
              <option value="'Lora', serif">Lora</option>

              {/* También puedes usar sans si quieres continuidad */}
              <option value="'Montserrat', sans-serif">Montserrat (sans)</option>
              <option value="'Raleway', sans-serif">Raleway (sans)</option>

              {/* Opción de mantener lo que ya hay en el override actual */}
              <option value={fontFamilyTitle || ''}>
                {fontFamilyTitle ? `— mantener actual (${fontFamilyTitle}) —` : '— mantener actual —'}
              </option>
            </select>
            <div className="mt-2">
              <label className="block text-xs text-[#5E5E5E] mb-1">Personalizada (Hero)</label>
              <input
                type="text"
                value={fontFamilyTitle}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.trim() === '') delKeys(['font-family-title']);
                  else setKey('font-family-title', v);
                }}
                placeholder="'Playfair Display', serif"
                className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              />
              <p className="text-xs text-[#5E5E5E] mt-1">
                Nota: si dejas este campo vacío, el título heredará la fuente base.
              </p>
            </div>
          </div>
        </div>

        {/* Subtítulo (Hero) */}
        <div className="mt-6 grid sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-3">
            <label className="block text-xs text-[#5E5E5E] mb-1">Fuente de subtítulo (Hero)</label>
            <select
              className="w-full p-2 border rounded-md text-[#2D2D2D] bg-white"
              value={fontFamilySubtitle}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  // hereda base → elimina el override
                  delKeys(['font-family-subtitle']);
                } else {
                  setKey('font-family-subtitle', v);
                }
              }}
            >
              {/* Heredar base */}
              <option value="">— heredar base —</option>

              {/* Serif “fine-art” / editorial */}
              <option value="'Playfair Display', serif">Playfair Display</option>
              <option value="'Cormorant Garamond', serif">Cormorant Garamond</option>
              <option value="'EB Garamond', serif">EB Garamond</option>
              <option value="'DM Serif Display', serif">DM Serif Display</option>
              <option value="'Libre Bodoni', serif">Libre Bodoni</option>
              <option value="'Gilda Display', serif">Gilda Display</option>
              <option value="'Prata', serif">Prata</option>
              <option value="'Bodoni Moda', serif">Bodoni Moda</option>
              <option value="'Gloock', serif">Gloock</option>
              <option value="'Cormorant Infant', serif">Cormorant Infant</option>
              <option value="'Libre Caslon Display', serif">Libre Caslon Display</option>
              <option value="'Lora', serif">Lora</option>

              {/* Sans minimal */}
              <option value="'Montserrat', sans-serif">Montserrat (sans)</option>
              <option value="'Raleway', sans-serif">Raleway (sans)</option>

              {/* Mantener actual */}
              <option value={fontFamilySubtitle || ''}>
                {fontFamilySubtitle ? `— mantener actual (${fontFamilySubtitle}) —` : '— mantener actual —'}
              </option>
            </select>

            <div className="mt-2">
              <label className="block text-xs text-[#5E5E5E] mb-1">Personalizada (Subtítulo)</label>
              <input
                type="text"
                value={fontFamilySubtitle}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.trim() === '') delKeys(['font-family-subtitle']);
                  else setKey('font-family-subtitle', v);
                }}
                placeholder="'EB Garamond', serif"
                className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              />
              <p className="text-xs text-[#5E5E5E] mt-1">
                Si lo dejas vacío, el subtítulo hereda la fuente base.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['font-size-base', 'font-family-base', 'font-family-title', 'font-family-subtitle'])}
          >
            Restaurar Typography
          </Button>
        </div>
      </section>

      {/* PALETAS (global) */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Paletas (global)</h3>

        <div className="flex gap-2 mb-3">
          <Button variant="outline" className="border-[#E6E3E0] text-[#2D2D2D]" onClick={() => applyPalettePreset('light')}>Light</Button>
          <Button variant="outline" className="border-[#E6E3E0] text-[#2D2D2D]" onClick={() => applyPalettePreset('dark')}>Dark</Button>
          <Button variant="outline" className="border-[#E6E3E0] text-[#2D2D2D]" onClick={() => applyPalettePreset('sepia')}>Sepia</Button>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <Swatch label="Fondo" value={paletteBg} onChange={(v) => setKey('color-bg', v)} />
          <Swatch label="Texto" value={paletteText} onChange={(v) => setKey('color-fg', v)} />
          <Swatch label="Muted" value={paletteMuted} onChange={(v) => setKey('color-muted', v)} />
          <Swatch label="Acento" value={paletteAccent} onChange={(v) => setKey('color-accent', v)} />
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['color-bg', 'color-fg', 'color-muted', 'color-accent'])}
          >
            Restaurar Paleta
          </Button>
        </div>

        <p className="text-xs text-[#5E5E5E] mt-2">
          Nota: estas variables globales son para temas futuros (botones, textos, etc.). No alteran el look actual a menos que los componentes las consuman.
        </p>
      </section>

      {/* GRID */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Grid</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Gap (px)</label>
            <input
              type="number"
              min={0}
              value={String(parseInt(gridGap || '')) || ''}
              onChange={(e) => {
                const n = e.target.value;
                if (n === '') delKeys(['grid-gap']);
                else setKey('grid-gap', `${parseInt(n, 10)}px`);
              }}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              placeholder="6"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Columnas (móvil)</label>
            <input
              type="number"
              min={1}
              max={6}
              value={String(parseInt(gridColsM || '')) || ''}
              onChange={(e) => {
                const n = e.target.value;
                if (n === '') delKeys(['grid-cols-mobile']);
                else setKey('grid-cols-mobile', `${parseInt(n, 10)}`);
              }}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              placeholder="2"
            />
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Columnas (desktop)</label>
            <input
              type="number"
              min={2}
              max={8}
              value={String(parseInt(gridColsD || '')) || ''}
              onChange={(e) => {
                const n = e.target.value;
                if (n === '') delKeys(['grid-cols-desktop']);
                else setKey('grid-cols-desktop', `${parseInt(n, 10)}`);
              }}
              className="w-full p-2 border rounded-md text-[#2D2D2D] placeholder:text-[#9A9A9A] bg-white"
              placeholder="4"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['grid-gap', 'grid-cols-mobile', 'grid-cols-desktop'])}
          >
            Restaurar Grid
          </Button>
        </div>
      </section>

      {/* SET FOCAL (imagen) */}
      <section className="rounded-xl border border-[#E6E3E0] bg-white p-4">
        <h3 className="font-semibold text-[#2D2D2D] mb-3">Set Focal (Cover)</h3>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Horizontal (X)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={focalX}
              onChange={(e) => setKey('hero-focal-x', `${parseInt(e.target.value, 10)}%`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{focalX}%</div>
          </div>
          <div>
            <label className="block text-xs text-[#5E5E5E] mb-1">Vertical (Y)</label>
            <input
              type="range"
              min={0}
              max={100}
              value={focalY}
              onChange={(e) => setKey('hero-focal-y', `${parseInt(e.target.value, 10)}%`)}
              className="w-full"
            />
            <div className="text-xs text-[#5E5E5E]">{focalY}%</div>
          </div>
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            className="border-[#E6E3E0] text-[#2D2D2D]"
            onClick={() => delKeys(['hero-focal-x', 'hero-focal-y'])}
          >
            Restaurar Focal
          </Button>
        </div>

        <p className="text-xs text-[#5E5E5E] mt-2">
          La posición focal se aplica sobre la imagen de portada actual (usa <code>object-position</code>).
        </p>
      </section>

      <p className="text-xs text-[#5E5E5E]">
        Nota: estos cambios son overrides por galería. Si no asignas un valor, la plantilla aplicará su valor por defecto.
      </p>
    </div>
  );
};

/* ---------- Pequeño componente de apoyo para paletas ---------- */
const Swatch = ({ label, value, onChange }) => {
  return (
    <div>
      <label className="block text-xs text-[#5E5E5E] mb-1">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-16 p-1 rounded-md border bg-white"
      />
    </div>
  );
};

export default DesignSettings;
