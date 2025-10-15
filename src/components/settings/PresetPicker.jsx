// src/components/settings/PresetPicker.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

function encodeUrlB64(obj) {
  const json = JSON.stringify(obj || {});
  const b64 = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return b64;
}

const PresetPicker = ({
  eventId,
  currentTemplate = 'classic',
  currentTokens = {},
  currentFlags = {},
  onApply, // ({ templateKey, tokens, flags }) => void
}) => {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [applyFlags, setApplyFlags] = useState(true);

  const selected = useMemo(
    () => presets.find(p => p.id === selectedId) || null,
    [presets, selectedId]
  );

  const fetchPresets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery_style_presets')
      .select('id,name,template_key,tokens,flags,is_default,updated_at')
      .order('name', { ascending: true });
    if (error) {
      toast({ title: 'Error cargando presets', description: error.message, variant: 'destructive' });
    } else {
      setPresets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchPresets(); }, []);

  const handleApply = () => {
    if (!selected) return;
    onApply?.({
      templateKey: selected.template_key,
      tokens: selected.tokens || {},
      flags: applyFlags ? (selected.flags || {}) : null,
    });
    toast({ title: `Preset "${selected.name}" aplicado` });
  };

  const handlePreview = () => {
    if (!selected) return;
    const d = encodeUrlB64(selected.tokens || {});
    const url = `/event/${eventId}?tpl=draft&d=${d}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveAsPreset = async () => {
    const name = window.prompt('Nombre del preset:', '');
    if (!name) return;
    const { error } = await supabase.from('gallery_style_presets').insert({
      name,
      template_key: currentTemplate || 'classic',
      tokens: currentTokens || {},
      flags: currentFlags || {},
      is_default: false,
    });
    if (error) {
      toast({ title: 'No se pudo guardar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Preset guardado' });
      fetchPresets();
    }
  };

  const handleMakeDefault = async () => {
    if (!selected) return;
    // Marcar este como default y desmarcar el resto (dos updates)
    const { error: e1 } = await supabase
      .from('gallery_style_presets')
      .update({ is_default: false })
      .eq('is_default', true); // RLS limita a los del usuario
    if (e1) {
      toast({ title: 'No se pudo actualizar defaults', description: e1.message, variant: 'destructive' });
      return;
    }
    const { error: e2 } = await supabase
      .from('gallery_style_presets')
      .update({ is_default: true })
      .eq('id', selected.id);
    if (e2) {
      toast({ title: 'No se pudo marcar como predeterminado', description: e2.message, variant: 'destructive' });
    } else {
      toast({ title: `Preset "${selected.name}" es ahora el predeterminado` });
      fetchPresets();
    }
  };

  return (
    <div className="rounded-xl border border-[#E6E3E0] bg-white p-4 space-y-3">
      <div className="flex items-center gap-3">
        <select
          className="min-w-[240px] p-2 border rounded-md"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading}
        >
          <option value="">{loading ? 'Cargando…' : '— Seleccionar preset —'}</option>
          {presets.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.is_default ? ' • Predeterminado' : ''}
            </option>
          ))}
        </select>

        <Button variant="outline" className="border-[#E6E3E0]" onClick={fetchPresets}>
          Refrescar
        </Button>

        <div className="flex items-center gap-2 ml-auto">
          <input
            id="applyFlags"
            type="checkbox"
            checked={applyFlags}
            onChange={(e) => setApplyFlags(e.target.checked)}
          />
          <label htmlFor="applyFlags" className="text-sm text-[#5E5E5E]">
            Incluir banderas (descargas/privacidad)
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={!selected} onClick={handleApply}>Aplicar</Button>
        <Button variant="outline" className="border-[#E6E3E0]" disabled={!selected} onClick={handlePreview}>
          Probar en galería (draft)
        </Button>
        <Button variant="outline" className="border-[#E6E3E0]" onClick={handleSaveAsPreset}>
          Guardar como preset
        </Button>
        <Button
          variant="outline"
          className="border-[#E6E3E0]"
          disabled={!selected || selected.is_default}
          onClick={handleMakeDefault}
        >
          Hacer predeterminado
        </Button>
      </div>

      {selected && (
        <p className="text-xs text-[#5E5E5E]">
          Plantilla: <code>{selected.template_key}</code> • Última actualización:{' '}
          {new Date(selected.updated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default PresetPicker;
