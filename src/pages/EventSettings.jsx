
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Image, Video, Lock, Download, Eye, KeyRound, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import LoadingSpinner from '@/components/LoadingSpinner';

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
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('title, date, location, settings')
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
      setSettings(prev => ({ ...prev, ...data.settings }));
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

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-[#F9F8F7]">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-[#2D2D2D] hover:bg-[#E6E3E0] mr-4">
              <ArrowLeft />
            </Button>
            <h1 className="text-3xl font-bold text-[#2D2D2D]">Configuración del Evento</h1>
          </div>

          <div className="bg-white rounded-2xl p-8 border border-[#E6E3E0] shadow-sm space-y-8">
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

            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Configuración de Galería</h2>
              <div className="space-y-4">
                <SettingSwitch id="allowPhotoUpload" label="Permitir subir fotos" icon={<Image />} checked={settings.allowPhotoUpload} onCheckedChange={(val) => handleSettingChange('allowPhotoUpload', val)} />
                <SettingSwitch id="allowVideoUpload" label="Permitir subir videos" icon={<Video />} checked={settings.allowVideoUpload} onCheckedChange={(val) => handleSettingChange('allowVideoUpload', val)} />
                <SettingSwitch id="requireModeration" label="Requerir moderación" description="Las subidas deben ser aprobadas antes de ser públicas." icon={<Lock />} checked={settings.requireModeration} onCheckedChange={(val) => handleSettingChange('requireModeration', val)} />
                <SettingSwitch id="allowGalleryView" label="Galería pública para invitados" icon={<Eye />} checked={settings.allowGalleryView} onCheckedChange={(val) => handleSettingChange('allowGalleryView', val)} />
                <SettingSwitch id="allowDownloads" label="Permitir descargas individuales" icon={<Download />} checked={settings.allowDownloads} onCheckedChange={(val) => handleSettingChange('allowDownloads', val)} />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Descarga Completa de Galería</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="downloadCode" className="text-sm font-medium text-[#5E5E5E] mb-2 block flex items-center"><KeyRound className="w-4 h-4 mr-2"/>Código de Descarga</Label>
                  <input id="downloadCode" type="text" value={settings.downloadCode || ''} onChange={(e) => handleSettingChange('downloadCode', e.target.value)} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" placeholder="Ej: BODA2025"/>
                </div>
                <div>
                  <Label htmlFor="downloadLimit" className="text-sm font-medium text-[#5E5E5E] mb-2 block flex items-center"><Hash className="w-4 h-4 mr-2"/>Límite de Descargas</Label>
                  <input id="downloadLimit" type="number" min="0" value={settings.downloadLimit || 0} onChange={(e) => handleSettingChange('downloadLimit', parseInt(e.target.value, 10))} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2D2D2D] mb-4">Fechas de la Galería</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uploadStartDate" className="text-sm font-medium text-[#5E5E5E] mb-2 block">Inicio de subidas</Label>
                  <input id="uploadStartDate" type="date" value={settings.uploadStartDate || ''} onChange={(e) => handleDateChange('uploadStartDate', e.target.value)} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
                <div>
                  <Label htmlFor="uploadEndDate" className="text-sm font-medium text-[#5E5E5E] mb-2 block">Fin de subidas</Label>
                  <input id="uploadEndDate" type="date" value={settings.uploadEndDate || ''} onChange={(e) => handleDateChange('uploadEndDate', e.target.value)} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
                <div>
                  <Label htmlFor="galleryExpiryDate" className="text-sm font-medium text-[#5E5E5E] mb-2 block">Expiración de galería</Label>
                  <input id="galleryExpiryDate" type="date" value={settings.galleryExpiryDate || ''} onChange={(e) => handleDateChange('galleryExpiryDate', e.target.value)} className="w-full p-3 rounded-lg bg-[#F9F8F7] border border-[#E6E3E0] text-[#2D2D2D]" />
                </div>
              </div>
            </section>

            <div className="pt-4">
              <Button onClick={handleSaveSettings} className="bg-[#9E7977] hover:bg-[#8a6866] text-white">
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </div>

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