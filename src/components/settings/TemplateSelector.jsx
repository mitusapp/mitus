import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Mapas de normalización */
const HUMAN_TO_CANON = {
  classic: 'classic',
  clean: 'minimal',
  overlay: 'elegant',
};
const CANON_TO_HUMAN = {
  classic: 'classic',
  minimal: 'clean',
  elegant: 'overlay',
};

/** Catálogo visible (alineado con templates.css y el Provider) */
const TEMPLATE_CATALOG = [
  {
    key: 'classic',
    name: 'Clásica',
    desc: 'Equilibrada, tipografía limpia y overlay suave.',
    preview: {
      '--gallery-hero-overlay': 'rgba(0,0,0,.45)',
      '--gallery-hero-border': 'rgba(255,255,255,.55)',
      '--gallery-accent': 'rgba(0,0,0,.85)',
    },
  },
  {
    key: 'clean',
    name: 'Clean',
    desc: 'Más aire, bordes ligeros y textos sutiles.',
    preview: {
      '--gallery-hero-overlay': 'rgba(255,255,255,.25)',
      '--gallery-hero-border': 'rgba(255,255,255,.9)',
      '--gallery-accent': 'rgba(0,0,0,.75)',
    },
  },
  {
    key: 'overlay',
    name: 'Overlay',
    desc: 'Hero más dramático con gradiente y contraste.',
    preview: {
      '--gallery-hero-overlay': 'rgba(0,0,0,.50)',
      '--gallery-hero-border': 'rgba(255,255,255,.75)',
      '--gallery-accent': 'rgba(0,0,0,.90)',
    },
  },
];

const TemplateCard = ({ tpl, selected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(tpl.key)}
      className={`group relative w-full text-left rounded-xl border transition 
        ${selected ? 'border-black shadow-sm' : 'border-[#E6E3E0] hover:border-black/50'} 
        bg-white overflow-hidden`}
      aria-pressed={selected}
    >
      {/* Mini preview */}
      <div
        className="h-28 w-full relative"
        style={tpl.preview}
      >
        {/* Fondo con imagen simulada */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1617183478968-6e7f5a6406fd?q=80&w=600&auto=format&fit=crop')] bg-cover bg-center" />
        {/* Overlay controlado por var() */}
        <div
          className="absolute inset-0"
          style={{ background: 'var(--gallery-hero-overlay, rgba(0,0,0,.45))' }}
        />
        {/* Borde circular sugerido */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full"
            style={{
              width: 64, height: 64,
              border: '3px solid var(--gallery-hero-border, rgba(255,255,255,.55))',
              boxShadow: '0 8px 30px rgba(0,0,0,.25)'
            }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-[#2D2D2D]">{tpl.name}</div>
            <div className="text-xs text-[#5E5E5E]">{tpl.desc}</div>
          </div>
          {selected && (
            <span className="inline-flex items-center justify-center rounded-full bg-black text-white w-6 h-6">
              <Check className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

const TemplateSelector = ({ value = 'classic', onChange, eventId }) => {
  // Normaliza el valor entrante (puede venir en canónico o humano)
  const normalizeIncoming = (v) => {
    if (!v) return 'classic';
    const low = String(v).toLowerCase();
    // Si ya es humano válido, úsalo tal cual
    if (['classic', 'clean', 'overlay'].includes(low)) return low;
    // Si es canónico, mapear a humano
    if (CANON_TO_HUMAN[low]) return CANON_TO_HUMAN[low];
    return 'classic';
  };

  const [selected, setSelected] = useState(normalizeIncoming(value));

  useEffect(() => {
    setSelected(normalizeIncoming(value));
  }, [value]);

  const apply = () => {
    // Guardar SIEMPRE la clave canónica
    const canonical = HUMAN_TO_CANON[selected] || 'classic';
    if (onChange) onChange(canonical);
  };

  const preview = (tplKey) => {
    // Vista previa con alias humano (?tpl=classic|clean|overlay)
    const base = `/event/${eventId}/gallery`;
    const url = `${base}?tpl=${encodeURIComponent(tplKey)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-4">
        {TEMPLATE_CATALOG.map((tpl) => (
          <TemplateCard
            key={tpl.key}
            tpl={tpl}
            selected={selected === tpl.key}
            onSelect={setSelected}
          />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="border-[#E6E3E0] text-[#2D2D2D]"
          onClick={() => preview(selected)}
        >
          Probar
        </Button>
        <Button
          type="button"
          className="bg-[#9E7977] hover:bg-[#8a6866] text-white"
          onClick={apply}
        >
          Aplicar
        </Button>
      </div>

      <p className="text-xs text-[#5E5E5E]">
        Consejo: “Aplicar” solo cambia la opción en este panel. Para que los invitados vean el nuevo diseño, recuerda pulsar <b>Guardar Cambios</b> al final.
      </p>
    </div>
  );
};

export default TemplateSelector;
