// src/pages/GuestUpload.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

// Orden y set de categorías solicitado
const CATEGORIES = [
  'Preparación',
  'Ceremonia',
  'Retratos',
  'Protocolo',
  'Familia & Amigos',
  'Recepción',
  'Fiesta',
  'Detalles & Decoración',
];

const DEFAULT_CATEGORY = 'Más momentos';

// Colores sobrios y elegantes por categoría (chips)
const CATEGORY_UI = {
  'Preparación': { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-800', hover: 'hover:bg-slate-100' },
  'Ceremonia': { bg: 'bg-zinc-50', border: 'border-zinc-300', text: 'text-zinc-800', hover: 'hover:bg-zinc-100' },
  'Retratos': { bg: 'bg-stone-50', border: 'border-stone-300', text: 'text-stone-800', hover: 'hover:bg-stone-100' },
  'Protocolo': { bg: 'bg-neutral-50', border: 'border-neutral-300', text: 'text-neutral-800', hover: 'hover:bg-neutral-100' },
  'Familia & Amigos': { bg: 'bg-gray-50', border: 'border-gray-300', text: 'text-gray-800', hover: 'hover:bg-gray-100' },
  'Recepción': { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', hover: 'hover:bg-sky-100' },
  'Fiesta': { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', hover: 'hover:bg-rose-100' },
  'Detalles & Decoración': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', hover: 'hover:bg-amber-100' },
};

// --- Helper: compresión de imágenes en el navegador (WebP 1800px máx) ---
async function compressImageToWeb(file, { maxDim = 1800, quality = 0.82, type = 'image/webp' } = {}) {
  const loadInput = async (f) => {
    try { return await createImageBitmap(f); } catch {
      const url = URL.createObjectURL(f);
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      URL.revokeObjectURL(url); return img;
    }
  };
  const bmp = await loadInput(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const can = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(w, h) : (() => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; })();
  const ctx = can.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = (can.convertToBlob)
    ? await can.convertToBlob({ type, quality })
    : await new Promise((res) => can.toBlob(res, type, quality));
  return { blob, w, h };
}

const GuestUpload = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  const [event, setEvent] = useState(null);
  const [guestName, setGuestName] = useState(
    state?.guestName ||
    localStorage.getItem(`mitus_guest_name_${eventId}`) ||
    sessionStorage.getItem('guestName') ||
    ''
  );
  // files: [{ file, previewUrl, type: 'photo' | 'video', category: string|null, selected: boolean }]
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);

  // Mantener referencia viva para revocar URLs al desmontar
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id, settings')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      toast({ title: 'Evento no encontrado', description: 'El evento que buscas no existe.', variant: 'destructive' });
      navigate('/');
      return;
    }
    setEvent(data);
    setLoading(false);
  }, [eventId, navigate, toast]);

  useEffect(() => {
    // Prefill si no viene en state
    if (!state?.guestName) {
      const storedGuestName = localStorage.getItem(`mitus_guest_name_${eventId}`) || sessionStorage.getItem('guestName') || '';
      setGuestName(storedGuestName);
    }
    fetchEvent();
  }, [fetchEvent, state?.guestName, eventId]);

  // Cargar archivos preseleccionados (desde Landing)
  useEffect(() => {
    if (state?.preselectedFiles?.length) {
      const prepared = Array.from(state.preselectedFiles).map((file) => ({
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
        type: file.type.startsWith('video/') ? 'video' : 'photo',
        category: null,
        selected: false,
      }));
      setFiles((prev) => [...prev, ...prepared]);
    }
  }, [state?.preselectedFiles]);

  // Si alguien llega aquí sin nombre (no pasó por Landing), invitar a volver
  useEffect(() => {
    if (!guestName) {
      toast({ title: 'Ingresa tu nombre completo', description: 'Vuelve a la portada del evento para continuar.', variant: 'destructive' });
      navigate(`/event/${eventId}`, { replace: true });
    } else {
      localStorage.setItem(`mitus_guest_name_${eventId}`, guestName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Revocar URLs SOLO al desmontar pantalla
  useEffect(() => {
    return () => { filesRef.current.forEach(f => { if (f?.previewUrl) { try { URL.revokeObjectURL(f.previewUrl); } catch {} } }); };
  }, []);

  const allowPhoto = event?.settings?.allowPhotoUpload ?? true;
  const allowVideo = event?.settings?.allowVideoUpload ?? true;

  const getAcceptString = () => {
    const accept = [];
    if (allowPhoto) accept.push('image/*');
    if (allowVideo) accept.push('video/*');
    return accept.join(',');
  };

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0 || !event) return;

    const prepared = Array.from(selectedFiles).map((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if ((!isVideo && !isImage) || (isImage && !allowPhoto) || (isVideo && !allowVideo)) {
        toast({ title: 'Archivo no permitido', description: `El archivo ${file.name} no es un tipo válido o no está permitido.`, variant: 'destructive' });
        return null;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : '';
      return { file, previewUrl, type: isVideo ? 'video' : 'photo', category: null, selected: false };
    }).filter(Boolean);

    setFiles(prev => [...prev, ...prepared]);
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const copy = [...prev];
      const target = copy[index];
      if (target?.previewUrl) { try { URL.revokeObjectURL(target.previewUrl); } catch {} }
      copy.splice(index, 1);
      return copy;
    });
  };

  const selectedCount = useMemo(() => files.filter(f => f.selected).length, [files]);

  const toggleSelectItem = (index) => {
    setFiles(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  // Ordenar: sin categoría primero, luego categorizados agrupados por orden del picker
  const reorderByCategoryGroups = (list) => {
    const idx = (cat) => CATEGORIES.indexOf(cat ?? '');
    const withIndex = list.map((f, i) => ({ f, i }));
    const noCat = withIndex.filter(x => !x.f.category);
    const yesCat = withIndex.filter(x => !!x.f.category);

    yesCat.sort((a, b) => {
      const ai = idx(a.f.category);
      const bi = idx(b.f.category);
      if (ai !== bi) return ai - bi;
      return a.i - b.i; // mantener orden relativo
    });

    return [...noCat, ...yesCat].map(x => x.f);
  };

  // Aplicación inmediata de categoría al click de chip
  const handleCategoryClick = (category) => {
    const count = files.filter(f => f.selected).length;
    if (count === 0) {
      toast({ title: 'Selecciona archivos', description: 'Haz clic en uno o varios archivos para asignarles la categoría.', variant: 'destructive' });
      return;
    }

    setFiles(prev => {
      const updated = prev.map(f => (f.selected ? { ...f, category, selected: false } : f));
      return reorderByCategoryGroups(updated);
    });

    toast({ title: 'Categoría asignada', description: `Se aplicó "${category}" a ${count} archivo${count === 1 ? '' : 's'}.` });
  };

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({ title: 'Selecciona archivos', description: 'Por favor selecciona una o más fotos/videos para subir', variant: 'destructive' });
      return;
    }

    setUploading(true);

    const rows = [];

    for (const item of files) {
      const { file, type, category } = item;
      try {
        const now = new Date();
        const stamp = now.toISOString().replace(/[-:TZ.]/g, '');
        const rand = Math.random().toString(36).slice(2, 8);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

        // 1) Subir ORIGINAL siempre
        const origPath = `${eventId}/orig/${stamp}_${rand}_${safeName}`;
        const { error: uploadOrigErr } = await supabase.storage
          .from('event-media')
          .upload(origPath, file, { contentType: file.type, cacheControl: '3600', upsert: false });
        if (uploadOrigErr) throw uploadOrigErr;
        const { data: origUrlData } = supabase.storage.from('event-media').getPublicUrl(origPath);

        let webUrl = origUrlData.publicUrl;
        let webW = null; let webH = null; let webSize = null;

        // 2) Si es foto, generar y subir versión web optimizada (WebP)
        if (type === 'photo') {
          try {
            const { blob: webBlob, w, h } = await compressImageToWeb(file, { maxDim: 1800, quality: 0.82, type: 'image/webp' });
            const webSafe = safeName.replace(/\.[^.]+$/, '') + '.webp';
            const webPath = `${eventId}/web/${stamp}_${rand}_${webSafe}`;
            const { error: uploadWebErr } = await supabase.storage
              .from('event-media')
              .upload(webPath, webBlob, { contentType: 'image/webp', cacheControl: '3600', upsert: false });
            if (!uploadWebErr) {
              const { data: webUrlData } = supabase.storage.from('event-media').getPublicUrl(webPath);
              webUrl = webUrlData.publicUrl; webW = w; webH = h; webSize = webBlob.size;
            }
          } catch (e) {
            console.warn('Fallo al optimizar imagen, usando original para web_url', e);
          }
        }

        rows.push({
          event_id: eventId,
          guest_name: guestName.trim() ? guestName.trim() : null,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: origUrlData.publicUrl, // ORIGINAL
          web_url: webUrl,                  // OPTIMIZADO (o original como fallback)
          web_width: webW,
          web_height: webH,
          web_size: webSize,
          title: file.name,
          description: '',
          type: type === 'video' ? 'video' : 'photo',
          category: category || DEFAULT_CATEGORY,
          approved: !(event?.settings?.requireModeration ?? false),
          uploaded_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        toast({ title: `Error al subir ${file.name}`, description: error.message || 'Hubo un problema. Inténtalo de nuevo.', variant: 'destructive' });
      }
    }

    if (rows.length) {
      const { error: dbError } = await supabase.from('uploads').insert(rows);
      if (dbError) { toast({ title: 'Error al guardar en la base de datos', description: dbError.message, variant: 'destructive' }); }
    }

    setUploading(false);

    if (rows.length) {
      toast({
        title: `¡${rows.length} de ${files.length} archivos subidos!`,
        description: event?.settings?.requireModeration ? 'Tus archivos están en revisión y aparecerán pronto.' : 'Tus archivos ya están disponibles en la galería.',
      });
      // Revocar URLs y reset
      files.forEach(f => { if (f?.previewUrl) { try { URL.revokeObjectURL(f.previewUrl); } catch {} } });
      setFiles([]);

      const goGallery = event?.settings?.allowGalleryView !== false;
      navigate(goGallery ? `/event/${eventId}/gallery` : `/event/${eventId}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-400 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TOP BAR fija */}
      <div className="fixed top-0 inset-x-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/event/${eventId}`)} className="text-slate-700 hover:bg-slate-200/60">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900 leading-none">Subir Contenido</h1>
            <p className="text-xs text-slate-600 mt-1">
              {guestName?.trim() ? <>Hola {guestName.trim()}, comparte tus mejores momentos</> : <>Hola, comparte tus mejores momentos</>}
            </p>
          </div>
        </div>
      </div>

      {/* espacio inferior para la barra sticky y superior para top bar */}
      <div className="pt-24 pb-28 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Título solicitado */}
              <h2 className="text-slate-900 font-semibold">Elige la categoría para tus archivos</h2>

              {/* Paso a paso simple */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                  <li>Selecciona uno o varios archivos que compartan la misma categoría (haz clic sobre los archivos).</li>
                  <li>Elige una categoría (se aplicará de inmediato a los archivos seleccionados).</li>
                </ol>
                <p className="mt-2 text-xs text-slate-500">
                  Estos pasos son opcionales. Si no asignas categoría, se guardarán como <span className="font-medium">“{DEFAULT_CATEGORY}”</span>.
                </p>
              </div>

              {/* Sección de categorías (no sticky) */}
              <div className="space-y-2">
                <div className="text-sm text-slate-600">
                  {selectedCount > 0 ? (
                    <span><span className="font-medium">{selectedCount}</span> seleccionado{selectedCount === 1 ? '' : 's'}</span>
                  ) : (
                    <span>Selecciona archivos y luego elige una categoría</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const ui = CATEGORY_UI[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategoryClick(cat)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${ui.bg} ${ui.border} ${ui.text} ${ui.hover}`}
                        aria-label={`Asignar categoría ${cat}`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Lista de archivos (masonry, sin recortes) */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-slate-900 font-semibold">Archivos seleccionados</h3>

                  {/* Masonry responsive */}
                  <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: '1rem' }}>
                    {files.map((item, index) => {
                      const isSelected = item.selected;
                      const hasCategory = !!item.category;

                      const base = 'relative mb-4 border rounded-none overflow-hidden transition-shadow cursor-pointer inline-block w-full';
                      let cardClasses = 'bg-slate-50 border-slate-200 hover:shadow-sm';

                      if (isSelected) {
                        cardClasses = 'bg-zinc-50 border-zinc-400 shadow';
                      } else if (hasCategory) {
                        const ui = CATEGORY_UI[item.category] || CATEGORY_UI['Recepción'];
                        cardClasses = `${ui.bg} ${ui.border} hover:shadow`;
                      }

                      return (
                        <div
                          key={`${item.file.name}-${index}`}
                          className={`${base} ${cardClasses}`}
                          style={{ breakInside: 'avoid' }}
                          onClick={() => toggleSelectItem(index)}
                        >
                          {/* Media */}
                          <div className="w-full">
                            {item.type === 'photo' ? (
                              <img src={item.previewUrl} alt="" className="w-full h-auto block" loading="lazy" />
                            ) : (
                              <video src={item.previewUrl} className="w-full h-auto block" muted controls={false} playsInline preload="metadata" />
                            )}
                          </div>

                          {/* Overlay inferior con categoría + eliminar */}
                          <div className="absolute inset-x-0 bottom-0">
                            <div className="bg-black/45 text-white px-3 py-2 flex items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm truncate">{hasCategory ? item.category : 'Sin categoría'}</p>
                              </div>
                              <Button onClick={(e) => { e.stopPropagation(); removeFile(index); }} size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Input oculto para selector */}
      <input ref={fileInputRef} type="file" multiple accept={getAcceptString()} hidden onChange={(e) => handleFileSelect(e.target.files)} />

      {/* Barra sticky inferior con botones */}
      <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="max-w-3xl mx-auto px-6 py-3 grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={openFilePicker} disabled={uploading} className="py-4 text-base">
            <Upload className="w-5 h-5 mr-2" /> Abrir galería
          </Button>
          <Button onClick={handleUpload} disabled={files.length === 0 || uploading} className="py-4 text-base">
            {uploading ? 'Subiendo…' : `Subir${files.length ? ` (${files.length})` : ''}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GuestUpload;
