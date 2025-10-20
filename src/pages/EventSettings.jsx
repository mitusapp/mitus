// src/pages/EventSettings.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Image, Video, Lock, Download, Eye, KeyRound, Hash, User, FileText, MessageSquare, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import LoadingSpinner from '@/components/LoadingSpinner';

// ⬇️ NUEVO: selector de plantilla
import TemplateSelector from '@/components/settings/TemplateSelector';
// ⬇️ NUEVO: panel de diseño (Cover/Color/Grid) con overrides por galería
import DesignSettings from '@/components/settings/DesignSettings';

// ⬇️ NUEVO: diálogo UI
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const EventSettings = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState({
    title: '',
    date: '',
    location: '',
  });
  const [settings, setSettings] = useState({
    allowPhotoUpload: true,
    allowVideoUpload: true,
    requireModeration: false,
    allowGalleryView: true,
    allowDownloads: false,
    uploadStartDate: null,
    uploadEndDate: null,
    galleryExpiryDate: null,
    downloadCode: '',
    downloadLimit: 10,
    requireGuestName: false,
    showFileName: false,
    allowGuestbook: false,
    perUserUploadLimit: 20,
    // ⬇️ NUEVO: plantilla por defecto (clásica)
    galleryTemplate: 'classic',
    // ⬇️ NUEVO: overrides de diseño por galería (Cover/CategoryBar/Grid/Topbar/Tipografía/etc.)
    design: {},
  });
  const [loading, setLoading] = useState(true);

  // ⬇️ NUEVO: portada del evento
  const [coverUrl, setCoverUrl] = useState('');
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('title, date, location, settings, cover_image_url')
      .eq('id', eventId)
      .single();

    if (error) {
      toast({ title: "Error al cargar configuración", variant: "destructive" });
      navigate(`/host/${eventId}`);
    } else {
      setEventDetails({
        title: data.title || '',
        date: data.date || '',
        location: data.location || '',
      });
      // Merge: conserva defaults locales y trae lo que ya exista en BD
      setSettings(prev => ({ ...prev, ...(data.settings || {}) }));
      setCoverUrl(data.cover_image_url || '');
    }
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setEventDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDateChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value === '' ? null : value }));
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('events')
      .update({
        title: eventDetails.title,
        date: eventDetails.date,
        location: eventDetails.location,
        settings: settings,
        // ⬇️ NUEVO: asegura persistir la portada si cambió
        cover_image_url: coverUrl || null,
      })
      .eq('id', eventId);

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuración guardada" });
    }
  };

  const handleDeleteEvent = async () => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar este evento? Esta acción es irreversible y borrará todos los datos asociados, incluyendo fotos, mensajes y lista de invitados.")) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-event', {
        body: { eventId },
      });

      if (error) throw error;

      toast({ title: "Evento eliminado", description: "El evento y todos sus datos han sido eliminados." });
      navigate('/profile');
    } catch (error) {
      toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    }
  };

  // ========= NUEVO: Vista previa de diseño (tpl=draft & d=base64(JSON)) =========
  const handlePreviewDesign = () => {
    try {
      const payload = JSON.stringify(settings.design || {});
      // base64 seguro para Unicode
      const base64 = btoa(unescape(encodeURIComponent(payload)));
      // Usa la ruta directa a la galería (sin /gallery)
      const url = `/event/${eventId}?tpl=draft&d=${encodeURIComponent(base64)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Error al preparar vista previa:', e);
      toast({ title: 'No se pudo abrir la vista previa', variant: 'destructive' });
    }
  };

  // ========= NUEVO: funciones para Portada =========
  const openCoverDialog = async () => {
    setIsCoverDialogOpen(true);
    // carga rápida de imágenes existentes de la galería para seleccionar
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('id, file_url, web_url, type')
        .eq('event_id', eventId)
        .order('uploaded_at', { ascending: false })
        .limit(60);

      if (!error) {
        const pics = (data || []).filter(u => u.type !== 'video');
        setGalleryImages(pics);
      }
    } catch (e) {
      // silencioso
    }
  };

  const handlePickExistingCover = async (url) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ cover_image_url: url })
        .eq('id', eventId);
      if (error) throw error;
      setCoverUrl(url);
      setIsCoverDialogOpen(false);
      toast({ title: 'Portada actualizada' });
    } catch (e) {
      toast({ title: 'No se pudo actualizar la portada', description: e.message, variant: 'destructive' });
    }
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Archivo no válido', description: 'Selecciona una imagen (JPG/PNG/WebP).', variant: 'destructive' });
      return;
    }

    try {
      setIsCoverUploading(true);
      const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
      const path = `${eventId}/${Date.now()}-${safeName}`;

      // ⬇️ Bucket sugerido: event-covers (créalo si no existe)
      const { error: upErr } = await supabase
        .storage
        .from('event-covers')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('event-covers').getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error('No se pudo obtener URL pública');

      const { error: evErr } = await supabase
        .from('events')
        .update({ cover_image_url: publicUrl })
        .eq('id', eventId);

      if (evErr) throw evErr;

      setCoverUrl(publicUrl);
      setIsCoverDialogOpen(false);
      toast({ title: 'Portada actualizada' });
    } catch (err) {
      toast({ title: 'Error al subir portada', description: err.message, variant: 'destructive' });
    } finally {
      setIsCoverUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearCover = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ cover_image_url: null })
        .eq('id', eventId);
      if (error) throw error;
      setCoverUrl('');
      toast({ title: 'Portada quitada' });
    } catch (e) {
      toast({ title: 'No se pudo quitar la portada', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-[#F9F8F7] pb-24">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-[#2D2D2D] hover:bg-[#E6E3E0] mr-4">
              <ArrowLeft />
            </Button>
            <h1 className="text-3xl font-bold text-[#2D2D2D]">Configuración del Evento</h1>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#E6E3E0] shadow-sm space-y-8">
            {/* Detalles generales de settings */}
            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Detalles Generales</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-[#5E5E5E] mb-2 block">Título del Evento</Label>
                  <input id="title" type="text" name="title" value={eventDetails.title} onChange={handleDetailChange} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
                <div>
                  <Label htmlFor="date" className="text-sm font-medium text-[#5E5E5E] mb-2 block">Fecha del Evento</Label>
                  <input id="date" type="date" name="date" value={eventDetails.date} onChange={handleDetailChange} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
                <div>
                  <Label htmlFor="location" className="text-sm font-medium text-[#5E5E5E] mb-2 block">Ubicación</Label>
                  <input id="location" type="text" name="location" value={eventDetails.location} onChange={handleDetailChange} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
              </div>
            </section>

            {/* ⬇️ NUEVO: Portada del evento */}
            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Portada del evento</h2>
              <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-[#E6E3E0] bg-[#F9F8F7] flex items-center justify-center">
                  {coverUrl ? (
                    <img src={coverUrl} alt="Portada del evento" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-[#5E5E5E] text-sm flex items-center gap-2">
                      <Image className="w-5 h-5" /> No hay portada seleccionada
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" onClick={openCoverDialog} className="bg-[#9E7977] hover:bg-[#8a6866] text-white">
                    <Upload className="w-4 h-4 mr-2" />
                    Subir/Seleccionar
                  </Button>
                  {coverUrl && (
                    <Button type="button" variant="outline" onClick={clearCover} className="border-[#E6E3E0] text-[#2D2D2D]">
                      <X className="w-4 h-4 mr-2" />
                      Quitar portada
                    </Button>
                  )}
                  <p className="text-xs text-[#5E5E5E]">
                    La portada se muestra de fondo en la cabecera de la galería. Puedes subir una imagen o elegir una ya subida.
                  </p>
                </div>
              </div>
            </section>

            {/* Configuración de galería */}
            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Configuración de Galería</h2>
              <div className="space-y-4">
                <SettingSwitch id="allowPhotoUpload" label="Permitir subir fotos" icon={<Image />} checked={settings.allowPhotoUpload} onCheckedChange={(val) => handleSettingChange('allowPhotoUpload', val)} />
                <SettingSwitch id="allowVideoUpload" label="Permitir subir videos" icon={<Video />} checked={settings.allowVideoUpload} onCheckedChange={(val) => handleSettingChange('allowVideoUpload', val)} />
                <SettingSwitch id="requireModeration" label="Requerir moderación" description="Las subidas deben ser aprobadas antes de ser públicas." icon={<Lock />} checked={settings.requireModeration} onCheckedChange={(val) => handleSettingChange('requireModeration', val)} />
                <SettingSwitch id="allowGalleryView" label="Galería pública para invitados" icon={<Eye />} checked={settings.allowGalleryView} onCheckedChange={(val) => handleSettingChange('allowGalleryView', val)} />
                <SettingSwitch id="allowDownloads" label="Permitir descargas individuales" icon={<Download />} checked={settings.allowDownloads} onCheckedChange={(val) => handleSettingChange('allowDownloads', val)} />

                {/* NUEVO: controlar "Dejar Mensaje" en la landing */}
                <SettingSwitch
                  id="allowGuestbook"
                  label="Permitir 'Dejar Mensaje' en la landing"
                  description="Muestra el botón para que los invitados dejen un mensaje."
                  icon={<MessageSquare className="w-4 h-4" />}
                  checked={!!settings.allowGuestbook}
                  onCheckedChange={(v) => handleSettingChange('allowGuestbook', v)}
                />

                {/* Switches auxiliares */}
                <SettingSwitch
                  id="requireGuestName"
                  label="Pedir nombre al invitado antes de subir"
                  description="Se solicitará una sola vez para atribuir las subidas."
                  icon={<User className="w-4 h-4" />}
                  checked={!!settings.requireGuestName}
                  onCheckedChange={(v) => handleSettingChange('requireGuestName', v)}
                />
                <SettingSwitch
                  id="showFileName"
                  label="Mostrar nombre de archivo en el visor"
                  description="Útil para fotógrafos o control interno."
                  icon={<FileText className="w-4 h-4" />}
                  checked={!!settings.showFileName}
                  onCheckedChange={(v) => handleSettingChange('showFileName', v)}
                />

                {/* Límite de archivos por usuario */}
                <div>
                  <Label htmlFor="perUserUploadLimit" className="text-sm font-medium text-[#5E5E5E] mb-2 block">
                    Límite de archivos por usuario
                  </Label>
                  <input
                    id="perUserUploadLimit"
                    type="number"
                    min="1"
                    value={settings.perUserUploadLimit ?? 20}
                    onChange={(e) => handleSettingChange('perUserUploadLimit', parseInt(e.target.value, 10) || 1)}
                    className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]"
                    placeholder="20"
                  />
                </div>
              </div>
            </section>

            {/* ⬇️ Selector de plantilla (con Probar/Aplicar) */}
            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Diseño de portada y galería</h2>
              <TemplateSelector
                value={settings.galleryTemplate || 'classic'}
                onChange={(tplKey) => handleSettingChange('galleryTemplate', tplKey)}
                eventId={eventId}
              />
            </section>

            {/* ⬇️ Ajustes finos de diseño + Probar diseño */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#2D2D2D]">Ajustes de Diseño (Cover / CategoryBar / Grid / Topbar / Tipografía / Paleta / Focal)</h2>
                {/* NUEVO botón Probar diseño */}
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#E6E3E0] text-[#2D2D2D]"
                  onClick={handlePreviewDesign}
                >
                  Probar diseño
                </Button>
              </div>

              <DesignSettings
                value={settings.design || {}}
                onChange={(next) => handleSettingChange('design', next)}
              />

              <p className="text-xs text-[#5E5E5E] mt-2">
                “Probar diseño” abre una vista previa en la galería con <code>?tpl=draft</code> sin guardar aún los cambios.
              </p>
            </section>

            {/* Descarga completa */}
            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Descarga Completa de Galería</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="downloadCode" className="text-sm font-medium text-[#5E5E5E] mb-2 flex items-center"><KeyRound className="w-4 h-4 mr-2"/>Código de Descarga</Label>
                  <input id="downloadCode" type="text" value={settings.downloadCode || ''} onChange={(e) => handleSettingChange('downloadCode', e.target.value)} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" placeholder="Ej: BODA2025"/>
                </div>
                <div>
                  <Label htmlFor="downloadLimit" className="text-sm font-medium text-[#5E5E5E] mb-2 flex items-center"><Hash className="w-4 h-4 mr-2"/>Límite de Descargas</Label>
                  <input id="downloadLimit" type="number" min="0" value={settings.downloadLimit || 0} onChange={(e) => handleSettingChange('downloadLimit', parseInt(e.target.value, 10))} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
              </div>
            </section>
          </div>

          {/* Danger zone */}
          <div className="mt-8 bg-red-100/50 border border-red-500/30 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-red-700">Zona de Peligro</h2>
            <p className="text-red-600 mt-2 mb-4">
              La eliminación de un evento es una acción permanente. Todos los datos, incluyendo fotos, mensajes y listas de invitados, se borrarán para siempre.
            </p>
            <Button onClick={handleDeleteEvent} variant="destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar Evento Permanentemente
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer de acciones fijo */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white/95 backdrop-blur border-t border-[#E6E3E0] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] p-3 flex justify-center">
            <Button onClick={handleSaveSettings} className="bg-[#9E7977] hover:bg-[#8a6866] text-white">
              <Save className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </div>

      {/* ⬇️ NUEVO: Diálogo para subir/seleccionar portada */}
      <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
        <DialogContent className="sm:max-w-[720px] bg-white">
          <DialogHeader>
            <DialogTitle>Portada del evento</DialogTitle>
            <DialogDescription>
              Sube una imagen o selecciona una existente de la galería.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-[220px_1fr] gap-6">
            {/* Columna izquierda: subir archivo */}
            <div className="bg-[#F9F8F7] rounded-xl border border-[#E6E3E0] p-4">
              <h4 className="font-semibold text-[#2D2D2D] mb-2">Subir imagen</h4>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverFileChange}
              />
              <Button
                type="button"
                className="w-full bg-[#9E7977] hover:bg-[#8a6866] text-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCoverUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isCoverUploading ? 'Subiendo...' : 'Elegir archivo'}
              </Button>
              <p className="text-xs text-[#5E5E5E] mt-2">
                Formatos recomendados: JPG/PNG/WebP.
              </p>
            </div>

            {/* Columna derecha: seleccionar existente */}
            <div>
              <h4 className="font-semibold text-[#2D2D2D] mb-2">Seleccionar desde subidas</h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[300px] overflow-auto">
                {galleryImages.length === 0 && (
                  <div className="col-span-full text-sm text-[#5E5E5E]">
                    No hay imágenes disponibles aún.
                  </div>
                )}
                {galleryImages.map((u) => {
                  const url = u.web_url || u.file_url;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#E6E3E0] hover:ring-2 hover:ring-[#9E7977]"
                      onClick={() => handlePickExistingCover(url)}
                      title="Usar como portada"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="border-[#E6E3E0] text-[#2D2D2D]" onClick={() => setIsCoverDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SettingSwitch = ({ id, label, description, icon, checked, onCheckedChange }) => (
  <div className="flex items-center justify-between bg-[#F9F8F7] p-4 rounded-lg border border-[#E6E3E0]">
    <div className="flex items-center">
      <div className="mr-4 text-[#9E7977]">{icon}</div>
      <div>
        <Label htmlFor={id} className="font-semibold text-[#2D2D2D]">{label}</Label>
        {description && <p className="text-xs text-[#5E5E5E]">{description}</p>}
      </div>
    </div>
    <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export default EventSettings;
