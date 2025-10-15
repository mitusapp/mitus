import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import CategoryPickerModal from '@/components/gallery/CategoryPickerModal';
import SelectedFilesList from '@/components/gallery/SelectedFilesList';

// ----- NUEVAS categorías (orden solicitado) -----
const CATEGORIES = [
  'DESTACADO',
  'PREPARACIÓN',
  'PRIMERA VISTA',
  'CEREMONIA',
  'RETRATOS',
  'PROTOCOLO',
  'FAMILIA',
  'AMIGOS',
  'RECEPCIÓN',
  'LA FIESTA',
  'DETALLES & DECORACIÓN',
];

const DEFAULT_CATEGORY = 'MÁS MOMENTOS';

// Colores por categoría (según indicación)
const CATEGORY_UI = {
  'DESTACADO':              { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-800',   hover: 'hover:bg-slate-100' },
  'PREPARACIÓN':            { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    hover: 'hover:bg-blue-100' },
  'PRIMERA VISTA':          { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-800',    hover: 'hover:bg-cyan-100' },
  'CEREMONIA':              { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-800',  hover: 'hover:bg-indigo-100' },
  'RETRATOS':               { bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-800',    hover: 'hover:bg-teal-100' },
  'PROTOCOLO':              { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-800',     hover: 'hover:bg-sky-100' },
  'FAMILIA':                { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-800',    hover: 'hover:bg-rose-100' },
  'AMIGOS':                 { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   hover: 'hover:bg-amber-100' },
  'RECEPCIÓN':              { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', hover: 'hover:bg-emerald-100' },
  'LA FIESTA':              { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-800',  hover: 'hover:bg-violet-100' },
  'DETALLES & DECORACIÓN':  { bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-800',  hover: 'hover:bg-purple-100' },
  // Por si algún día muestras el DEFAULT como chip:
  'MÁS MOMENTOS':           { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-800',   hover: 'hover:bg-slate-100' },
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

// ---- helpers de límite (solo local, sin BD) — ACTUALIZADO PARA usar perUserUploadLimit
const getLimitFromSettings = (settings) => {
  const v =
    settings?.perUserUploadLimit ??   // <- clave real que guardas en settings
    settings?.userUploadLimit ??
    settings?.maxUploadsPerUser ??
    settings?.uploadLimitPerUser ??
    settings?.uploadLimit ??
    20;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : 20;
};

// UUID v4 simple (suficiente para identificar dispositivo localmente)
const getOrCreateDeviceId = () => {
  const KEY = 'mitus_device_id_v1';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = ([1e7]+-1e3+-4e3+-8e3+-1e11)
      .replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    localStorage.setItem(KEY, id);
  }
  return id;
};

const makeLocalCountKey = (eventId, deviceId) => `mitus_uploaded_count_${eventId}_${deviceId}`;

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

  // Identificador de dispositivo y conteo local
  const [deviceId, setDeviceId] = useState(null);
  const [usedLocal, setUsedLocal] = useState(0);

  // files: [{ file, previewUrl, type: 'photo' | 'video', category: string|null, selected: boolean }]
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadIndex, setUploadIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Límite por usuario (dispositivo)
  const [userLimit, setUserLimit] = useState(20);

  // Modal y categoría pendiente por lote
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(true); // se muestra al cargar
  const [pendingCategory, setPendingCategory] = useState(null);

  const fileInputRef = useRef(null);

  // Mantener referencia viva para revocar URLs al desmontar
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  // Inicializar deviceId y conteo local
  useEffect(() => {
    const id = getOrCreateDeviceId();
    setDeviceId(id);
    const key = makeLocalCountKey(eventId, id);
    const val = parseInt(localStorage.getItem(key) || '0', 10);
    setUsedLocal(Number.isFinite(val) ? val : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

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
    setUserLimit(getLimitFromSettings(data.settings));
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    // Prefill si no viene en state
    if (!state?.guestName) {
      const storedGuestName = localStorage.getItem(`mitus_guest_name_${eventId}`) || sessionStorage.getItem('guestName') || '';
      setGuestName(storedGuestName);
    }
    fetchEvent();
  }, [fetchEvent, state?.guestName, eventId]);

  // Cargar archivos preseleccionados (flujos antiguos)
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

  // Requerir nombre SOLO si la configuración lo exige (no afecta al límite por dispositivo)
  useEffect(() => {
    if (!loading && event) {
      const mustHaveName = !!(event.settings?.requireGuestName);
      const hasName = !!(guestName && guestName.trim());
      if (mustHaveName && !hasName) {
        toast({ title: 'Ingresa tu nombre completo', description: 'Vuelve a la portada del evento para continuar.', variant: 'destructive' });
        navigate(`/event/${eventId}`, { replace: true });
      } else if (hasName) {
        localStorage.setItem(`mitus_guest_name_${eventId}`, guestName.trim());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, event]);

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

  // Solo contamos con lo local (por dispositivo)
  const used = usedLocal;
  const remainingCapacity = Math.max(0, userLimit - used - files.length);

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0 || !event) return;

    const remaining = Math.max(0, userLimit - used - files.length);
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Ya no puedes agregar más archivos (límite ${userLimit}).`, variant: 'destructive' });
      return;
    }

    const selectedArr = Array.from(selectedFiles);
    const limitedArr = selectedArr.slice(0, remaining);
    const ignored = selectedArr.length - limitedArr.length;

    const prepared = limitedArr.map((file) => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if ((!isVideo && !isImage) || (isImage && !allowPhoto) || (isVideo && !allowVideo)) {
        toast({ title: 'Archivo no permitido', description: `El archivo ${file.name} no es un tipo válido o no está permitido.`, variant: 'destructive' });
        return null;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : '';
      return {
        file,
        previewUrl,
        type: isVideo ? 'video' : 'photo',
        category: pendingCategory || null,
        selected: false,
      };
    }).filter(Boolean);

    setFiles(prev => reorderByCategoryGroups([...prev, ...prepared]));
    setPendingCategory(null);

    if (ignored > 0) {
      toast({
        title: 'Se alcanzó el límite',
        description: `${ignored} archivo${ignored === 1 ? '' : 's'} no se agregaron por superar el límite de ${userLimit}.`,
      });
    }
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

  const removeSelected = () => {
    setFiles(prev => {
      const remaining = [];
      prev.forEach(f => {
        if (f.selected) {
          if (f.previewUrl) { try { URL.revokeObjectURL(f.previewUrl); } catch {} }
        } else {
          remaining.push(f);
        }
      });
      return remaining;
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

  const toggleSelectAll = () => {
    if (selectedCount > 0) {
      setFiles(prev => prev.map(f => ({ ...f, selected: false })));
    } else {
      setFiles(prev => prev.map(f => ({ ...f, selected: true })));
    }
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
      return a.i - b.i;
    });

    return [...noCat, ...yesCat].map(x => x.f);
  };

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
    const remaining = Math.max(0, userLimit - used - files.length);
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: `Ya no puedes agregar más archivos (límite ${userLimit}).`, variant: 'destructive' });
      return;
    }
    setIsCategoryModalOpen(true);
  };

  const afterPickCategory = (cat) => {
    if (!allowPhoto && !allowVideo) {
      toast({ title: 'Subida deshabilitada', description: 'Este evento no permite subir archivos.', variant: 'destructive' });
      setIsCategoryModalOpen(false);
      return;
    }
    const remaining = Math.max(0, userLimit - used - files.length);
    if (remaining <= 0) {
      setIsCategoryModalOpen(false);
      toast({ title: 'Límite alcanzado', description: `Ya no puedes agregar más archivos (límite ${userLimit}).`, variant: 'destructive' });
      return;
    }
    setPendingCategory(cat);
    setIsCategoryModalOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({ title: 'Selecciona archivos', description: 'Por favor selecciona una o más fotos/videos para subir', variant: 'destructive' });
      return;
    }

    // Validación con base en conteo local (por dispositivo)
    const capacity = Math.max(0, userLimit - used);
    if (capacity <= 0) {
      toast({ title: 'Límite alcanzado', description: `Ya llegaste a tu máximo de ${userLimit} archivos.`, variant: 'destructive' });
      return;
    }
    const itemsToUpload = files.slice(0, capacity);

    setUploading(true);
    setUploadIndex(0);

    const rows = [];

    for (let i = 0; i < itemsToUpload.length; i++) {
      const item = itemsToUpload[i];
      const { file, type } = item;
      const category = item.category || DEFAULT_CATEGORY;

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
          guest_name: guestName?.trim() ? guestName.trim() : null, // compatibilidad de flujo existente
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
          category,
          approved: !(event?.settings?.requireModeration ?? false),
          uploaded_at: new Date().toISOString(),
        });

        setUploadIndex(i + 1);
      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        toast({ title: `Error al subir ${file.name}`, description: error.message || 'Hubo un problema. Inténtalo de nuevo.', variant: 'destructive' });
      }
    }

    if (rows.length) {
      const { error: dbError } = await supabase.from('uploads').insert(rows);
      if (dbError) {
        toast({ title: 'Error al guardar en la base de datos', description: dbError.message, variant: 'destructive' });
      } else {
        // Actualizar conteo local por dispositivo+evento
        if (deviceId) {
          const key = makeLocalCountKey(eventId, deviceId);
          const prev = parseInt(localStorage.getItem(key) || '0', 10) || 0;
          const next = prev + rows.length;
          localStorage.setItem(key, String(next));
          setUsedLocal(next);
        }
      }
    }

    setUploading(false);

    if (rows.length) {
      const skipped = files.length - rows.length;
      toast({
        title: skipped > 0 ? `¡${rows.length} archivos subidos (se omitieron ${skipped})!` : `¡${rows.length} archivos subidos!`,
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

  const percent = files.length ? Math.floor((uploadIndex / files.length) * 100) : 0;
  const remainingNow = Math.max(0, userLimit - used - files.length);

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
              {/* Título / instrucciones */}
              <h2 className="text-slate-900 font-semibold">Elige la categoría para tus archivos</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                  <li>Usa “Abrir galería” y elige la categoría del lote.</li>
                  <li>Confirma los archivos seleccionados. (Opcional) re-etiqueta con los chips.</li>
                </ol>
                <p className="mt-2 text-xs text-slate-600">
                  Puedes subir hasta <span className="font-medium">{userLimit}</span> archivos por invitado.
                  {used > 0 && <> Ya subidos (este dispositivo): <span className="font-medium">{used}</span>.</>}
                  {' '}Disponibles ahora: <span className="font-medium">{remainingNow}</span>.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Si algún archivo no tiene categoría, se guardará como <span className="font-medium">“{DEFAULT_CATEGORY}”</span>.
                </p>
              </div>

              {/* Categorías */}
              <div className="space-y-2">
                <h3 className="text-slate-900 font-semibold">Categorías</h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const ui = CATEGORY_UI[cat] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', hover: 'hover:bg-slate-100' };
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

              {/* Lista de archivos (componente separado) */}
              {files.length > 0 && (
                <SelectedFilesList
                  files={files}
                  selectedCount={selectedCount}
                  onToggleItem={toggleSelectItem}
                  onRemoveItem={removeFile}
                  onRemoveSelected={removeSelected}
                  onToggleSelectAll={toggleSelectAll}
                  categoryUI={CATEGORY_UI}
                />
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
            {uploading ? `Subiendo… (${uploadIndex} de ${files.length} · ${percent}%)` : `Subir${files.length ? ` (${files.length})` : ''}`}
          </Button>
        </div>
      </div>

      {/* Modal de categorías */}
      <CategoryPickerModal
        open={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onPick={afterPickCategory}
      />

      {/* Overlay de progreso de subida */}
      {uploading && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl px-6 py-5 w-[90vw] max-w-sm text-center">
            <h4 className="text-slate-900 font-semibold mb-2">Subiendo archivos…</h4>
            <p className="text-sm text-slate-600 mb-4">{uploadIndex} de {files.length} · {percent}%</p>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-700" style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestUpload;
