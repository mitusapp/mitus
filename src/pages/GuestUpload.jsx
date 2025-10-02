
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, Video, Upload, ArrowLeft, Image, MessageSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const GuestUpload = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('id, settings')
      .eq('id', eventId)
      .single();

    if (error || !data) {
      toast({
        title: "Evento no encontrado",
        description: "El evento que buscas no existe.",
        variant: "destructive"
      });
      navigate('/');
      return;
    }
    setEvent(data);
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    const storedGuestName = sessionStorage.getItem('guestName');
    if (!storedGuestName) {
      navigate(`/event/${eventId}?action=upload`, { replace: true });
      return;
    }
    setGuestName(storedGuestName);
    fetchEvent();
  }, [eventId, navigate, fetchEvent]);

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newFiles = Array.from(selectedFiles).map(file => {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if ((!isVideo && !isImage) || (isImage && !event.settings?.allowPhotoUpload) || (isVideo && !event.settings?.allowVideoUpload)) {
        toast({
          title: "Archivo no permitido",
          description: `El archivo ${file.name} no es un tipo de archivo válido o no está permitido para este evento.`,
          variant: "destructive"
        });
        return null;
      }
      return file;
    }).filter(Boolean);

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Selecciona archivos",
        description: "Por favor selecciona una o más fotos/videos para subir",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    const uploadPromises = files.map(async (file) => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${eventId}/${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('event-media').getPublicUrl(fileName);
        
        return {
          event_id: eventId,
          guest_name: guestName,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          file_url: urlData.publicUrl,
          title: file.name,
          description: '',
          type: file.type.startsWith('video/') ? 'video' : 'photo',
          approved: !event.settings?.requireModeration
        };
      } catch (error) {
        console.error("Upload error for file:", file.name, error);
        toast({
          title: `Error al subir ${file.name}`,
          description: error.message || "Hubo un problema. Inténtalo de nuevo.",
          variant: "destructive"
        });
        return null;
      }
    });

    const uploadResults = await Promise.all(uploadPromises);
    const successfulUploads = uploadResults.filter(Boolean);

    if (successfulUploads.length > 0) {
      const { error: dbError } = await supabase.from('uploads').insert(successfulUploads);
      if (dbError) {
        toast({
          title: "Error al guardar en la base de datos",
          description: dbError.message,
          variant: "destructive"
        });
      }
    }

    setUploading(false);
    if (successfulUploads.length > 0) {
      toast({
        title: `¡${successfulUploads.length} de ${files.length} archivos subidos!`,
        description: event.settings?.requireModeration 
          ? "Tus archivos están en revisión y aparecerán pronto."
          : "Tus archivos ya están disponibles en la galería."
      });
      setFiles([]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  const getAcceptString = () => {
    let accept = [];
    if (event.settings?.allowPhotoUpload) accept.push('image/*');
    if (event.settings?.allowVideoUpload) accept.push('video/*');
    return accept.join(',');
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate(`/event/${eventId}`)}
              className="text-white hover:bg-white/10 mr-4"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Subir Contenido</h1>
              <p className="text-gray-300">Hola {guestName}, comparte tus mejores momentos</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 space-y-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                dragOver 
                  ? 'border-purple-400 bg-purple-500/10' 
                  : 'border-white/30 hover:border-purple-400 hover:bg-purple-500/5'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <div className="bg-purple-500/20 rounded-full p-4">
                    <Upload className="w-12 h-12 text-purple-300" />
                  </div>
                </div>
                <div>
                  <p className="text-white text-lg font-medium mb-2">
                    Arrastra tus archivos aquí o haz clic para seleccionar
                  </p>
                  <p className="text-gray-300 text-sm">
                    {event.settings?.allowPhotoUpload && "Fotos (JPG, PNG)"}
                    {event.settings?.allowPhotoUpload && event.settings?.allowVideoUpload && " • "}
                    {event.settings?.allowVideoUpload && "Videos (MP4, MOV)"}
                  </p>
                </div>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept={getAcceptString()}
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  <div className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors duration-300 inline-flex items-center">
                    <Camera className="w-5 h-5 mr-2" />
                    Seleccionar Archivos
                  </div>
                </label>
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Archivos seleccionados:</h3>
                <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/10 p-2 rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        {file.type.startsWith('video/') ? <Video className="w-4 h-4 text-blue-300"/> : <Image className="w-4 h-4 text-purple-300"/>}
                        <span className="text-sm text-white truncate">{file.name}</span>
                      </div>
                      <Button onClick={() => removeFile(index)} size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4"/>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Subir {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
                </>
              )}
            </Button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate(`/event/${eventId}/guestbook`)}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10 py-3"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Dejar Mensaje
            </Button>
            
            {event?.settings?.allowGalleryView && (
              <Button
                onClick={() => navigate(`/event/${eventId}/gallery`)}
                variant="outline"
                className="flex-1 border-white/20 text-white hover:bg-white/10 py-3"
              >
                <Image className="w-4 h-4 mr-2" />
                Ver Galería
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GuestUpload;
