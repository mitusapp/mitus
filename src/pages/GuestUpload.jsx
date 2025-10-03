// src/pages/GuestUpload.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Upload, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const CATEGORIES = [
  'Preparación',
  'Ceremonia',
  'Retratos',
  'Familia & Amigos',
  'Detalles & Decoración',
  'Recepción',
];

const DEFAULT_CATEGORY = 'Más momentos';

// Estilos por categoría (picker + tarjeta)
const CATEGORY_UI = {
  'Preparación': {
    bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800',
    hover: 'hover:bg-slate-100', badgeBg: 'bg-slate-50/95', badgeBorder: 'border-slate-200', badgeText: 'text-slate-800'
  },
  'Ceremonia': {
    bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800',
    hover: 'hover:bg-indigo-100', badgeBg: 'bg-indigo-50/95', badgeBorder: 'border-indigo-200', badgeText: 'text-indigo-800'
  },
  'Retratos': {
    bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800',
    hover: 'hover:bg-violet-100', badgeBg: 'bg-violet-50/95', badgeBorder: 'border-violet-200', badgeText: 'text-violet-800'
  },
  'Familia & Amigos': {
    bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800',
    hover: 'hover:bg-teal-100', badgeBg: 'bg-teal-50/95', badgeBorder: 'border-teal-200', badgeText: 'text-teal-800'
  },
  'Detalles & Decoración': {
    bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800',
    hover: 'hover:bg-amber-100', badgeBg: 'bg-amber-50/95', badgeBorder: 'border-amber-200', badgeText: 'text-amber-800'
  },
  'Recepción': {
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800',
    hover: 'hover:bg-emerald-100', badgeBg: 'bg-emerald-50/95', badgeBorder: 'border-emerald-200', badgeText: 'text-emerald-800'
  },
};

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
  const [dragOver, setDragOver] = useState(false);
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
      toast({
        title: 'Evento no encontrado',
        description: 'El evento que buscas no existe.',
        variant: 'destructive',
      });
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
    return () => {
      filesRef.current.forEach(f => {
        if (f?.previewUrl) {
          try { URL.revokeObjectURL(f.previewUrl); } catch {}
        }
      });
    };
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
        toast({
          title: 'Archivo no permitido',
          description: `El archivo ${file.name} no es un tipo válido o no está permitido.`,
          variant: 'destructive',
        });
        return null;
      }

      const previewUrl = isImage ? URL.createObjectURL(file) : '';
      return {
        file,
        previewUrl,
        type: isVideo ? 'video' : 'photo',
        category: null,
        selected: false,
      };
    }).filter(Boolean);

    setFiles(prev => [...prev, ...prepared]);
  };

  const removeFile = (index) => {
    setFiles(prev => {
      const copy = [...prev];
      const target = copy[index];
      if (target?.previewUrl) {
        try { URL.revokeObjectURL(target.previewUrl); } catch {}
      }
      copy.splice(index, 1);
      return copy;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

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
      toast({
        title: 'Selecciona archivos',
        description: 'Haz clic en uno o varios archivos para asignarles la categoría.',
        variant: 'destructive',
      });
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
      toast({
        title: 'Selecciona archivos',
        description: 'Por favor selecciona una o más fotos/videos para subir',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    const uploadPromises = files.map(async (item) => {
      const { file, type, category } = item;
      try {
        const now = new Date();
        const stamp = now.toISOString().replace(/[-:TZ.]/g, '');
        const rand = Math.random().toString(36).slice(2, 8);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${eventId}/${stamp}_${rand}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(filePath, file, { contentType: file.type, cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(filePath);

        return {
          event_id: eventId,
          guest_name: guestName.trim() ? guestName.trim() : null,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: urlData.publicUrl,
          title: file.name,
          description: '',
          type: type === 'video' ? 'video' : 'photo',
          category: category || DEFAULT_CATEGORY, // si no se asigna, guardar "Más momentos"
          approved: !(event?.settings?.requireModeration ?? false),
          uploaded_at: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Upload error for file:', file.name, error);
        toast({
          title: `Error al subir ${file.name}`,
          description: error.message || 'Hubo un problema. Inténtalo de nuevo.',
          variant: 'destructive',
        });
        return null;
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
    const successfulUploads = uploadResults.filter(Boolean);

    if (successfulUploads.length > 0) {
      const { error: dbError } = await supabase.from('uploads').insert(successfulUploads);
      if (dbError) {
        toast({ title: 'Error al guardar en la base de datos', description: dbError.message, variant: 'destructive' });
      }
    }

    setUploading(false);

    if (successfulUploads.length > 0) {
      toast({
        title: `¡${successfulUploads.length} de ${files.length} archivos subidos!`,
        description: event?.settings?.requireModeration
          ? 'Tus archivos están en revisión y aparecerán pronto.'
          : 'Tus archivos ya están disponibles en la galería.',
      });
      // Revocar URLs y reset
      files.forEach(f => { if (f?.previewUrl) { try { URL.revokeObjectURL(f.previewUrl); } catch {} } });
      setFiles([]);

      // Ir a galería si está permitida; si no, a landing
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
      {/* espacio inferior para la barra sticky */}
      <div className="pb-28 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Header */}
            <div className="flex items-center mb-8">
              <Button variant="ghost" onClick={() => navigate(`/event/${eventId}`)} className="text-slate-700 hover:bg-slate-200/60 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Subir Contenido</h1>
                <p className="text-slate-600">
                  {guestName?.trim() ? <>Hola {guestName.trim()}, comparte tus mejores momentos</> : <>Hola, comparte tus mejores momentos</>}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Paso a paso simple */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700">
                  <li>Selecciona uno o varios archivos que compartan la misma categoría (haz clic sobre los archivos).</li>
                  <li>Elige una categoría (se aplicará de inmediato a los archivos seleccionados).</li>
                </ol>
                <p className="mt-2 text-xs text-slate-500">
                  Este paso es opcional. Si no asignas categoría, se guardarán como <span className="font-medium">“{DEFAULT_CATEGORY}”</span>.
                </p>
              </div>

              {/* Dropzone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragOver ? 'border-slate-400 bg-slate-100' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100/60'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="rounded-full p-4 bg-slate-100">
                      <Upload className="w-12 h-12 text-slate-600" />
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-900 text-lg font-medium mb-2">Arrastra tus archivos aquí o usa el botón inferior</p>
                    <p className="text-slate-600 text-sm">
                      {allowPhoto && 'Fotos (JPG, PNG)'}
                      {allowPhoto && allowVideo && ' • '}
                      {allowVideo && 'Videos (MP4, MOV)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* BARRA STICKY: chips de categorías */}
              {files.length > 0 && (
                <div className="sticky top-2 sm:top-4 z-30 bg-white/95 backdrop-blur rounded-xl border border-slate-200 p-3">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
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
                </div>
              )}

              {/* Lista de archivos (masonry, sin recortes) */}
              {files.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-slate-900 font-semibold">Archivos seleccionados</h3>

                  {/* Masonry responsive */}
                  <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: '1rem' }}>
                    {files.map((item, index) => {
                      const isSelected = item.selected;
                      const hasCategory = !!item.category;

                      const base = 'relative mb-4 border rounded-xl overflow-hidden transition-shadow cursor-pointer inline-block w-full';
                      let cardClasses = 'bg-slate-50 border-slate-200 hover:shadow-sm';
                      let textColor = 'text-slate-400';
                      let badgeClasses = 'bg-slate-50/95 text-slate-800 border-slate-200';

                      if (isSelected) {
                        cardClasses = 'bg-indigo-50 border-indigo-500 shadow';
                        textColor = 'text-indigo-700';
                      } else if (hasCategory) {
                        const ui = CATEGORY_UI[item.category] || CATEGORY_UI['Recepción'];
                        cardClasses = `${ui.bg} ${ui.border} hover:shadow`;
                        textColor = ui.text;
                        badgeClasses = `${ui.badgeBg} ${ui.badgeText} ${ui.badgeBorder}`;
                      }

                      return (
                        <div
                          key={`${item.file.name}-${index}`}
                          className={`${base} ${cardClasses}`}
                          style={{ breakInside: 'avoid' }}
                          onClick={() => toggleSelectItem(index)}
                        >
                          {hasCategory && (
                            <span className={`pointer-events-none absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[11px] leading-none border shadow-sm ${badgeClasses}`}>
                              {item.category}
                            </span>
                          )}

                          <div className="w-full">
                            {item.type === 'photo' ? (
                              <img src={item.previewUrl} alt="" className="w-full h-auto block" loading="lazy" />
                            ) : (
                              <video src={item.previewUrl} className="w-full h-auto block" muted controls={false} playsInline preload="metadata" />
                            )}
                          </div>

                          <div className="p-3 flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm truncate ${textColor}`}>{hasCategory ? item.category : 'Sin categoría'}</p>
                            </div>
                            <Button onClick={(e) => { e.stopPropagation(); removeFile(index); }} size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
            <Upload className="w-5 h-5 mr-2" /> Seleccionar archivos
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
