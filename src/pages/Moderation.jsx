import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Eye, Trash2, User, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const Moderation = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchModerationData = useCallback(async () => {
    setLoading(true);

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, title')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) {
      toast({ title: "Error", description: "No se pudo cargar el evento o no tienes permiso.", variant: "destructive" });
      navigate('/');
      return;
    }
    setEvent(eventData);

    const { data: uploadsData, error: uploadsError } = await supabase
      .from('uploads')
      .select('*')
      .eq('event_id', eventId)
      .order('uploaded_at', { ascending: false });

    if (uploadsError) {
      console.error('Error fetching uploads:', uploadsError);
    } else {
      setUploads(uploadsData);
    }
    setLoading(false);
  }, [eventId, navigate]);

  useEffect(() => {
    fetchModerationData();
  }, [fetchModerationData]);

  const updateUploadStatus = async (uploadId, newStatus) => {
    const { error } = await supabase
      .from('uploads')
      .update({ approved: newStatus })
      .eq('id', uploadId);

    if (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    } else {
      setUploads(uploads.map(u => u.id === uploadId ? { ...u, approved: newStatus } : u));
      toast({ title: "Estado actualizado", description: `El archivo ha sido ${newStatus ? 'aprobado' : 'rechazado'}.` });
    }
  };

  const handleDelete = async (uploadId) => {
    const uploadToDelete = uploads.find(u => u.id === uploadId);
    if (!uploadToDelete) return;

    const { error: deleteError } = await supabase.from('uploads').delete().eq('id', uploadId);

    if (deleteError) {
      toast({ title: "Error", description: "No se pudo eliminar el archivo.", variant: "destructive" });
      return;
    }

    const filePath = uploadToDelete.file_url.split('/').slice(-2).join('/');
    const { error: storageError } = await supabase.storage.from('event-media').remove([filePath]);

    if (storageError) {
      console.error("Storage error:", storageError);
    }

    setUploads(uploads.filter(u => u.id !== uploadId));
    toast({ title: "Eliminado", description: "El archivo ha sido eliminado permanentemente." });
  };

  const filteredUploads = uploads.filter(upload => {
    switch (filter) {
      case 'pending': return upload.approved === null;
      case 'approved': return upload.approved === true;
      case 'rejected': return upload.approved === false;
      default: return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando moderación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Moderación de Contenido</h1>
                <p className="text-gray-300">{event.title}</p>
              </div>
            </div>
            <div className="flex bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
              <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                Pendientes ({uploads.filter(u => u.approved === null).length})
              </button>
              <button onClick={() => setFilter('approved')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${filter === 'approved' ? 'bg-green-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                Aprobados ({uploads.filter(u => u.approved === true).length})
              </button>
              <button onClick={() => setFilter('rejected')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${filter === 'rejected' ? 'bg-red-600 text-white' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
                Rechazados ({uploads.filter(u => u.approved === false).length})
              </button>
            </div>
          </div>

          {filteredUploads.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay contenido {filter}</h3>
                <p className="text-gray-300">Todo está al día.</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredUploads.map((upload, index) => (
                <motion.div key={upload.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: index * 0.05 }} className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-purple-600/30 to-blue-600/30 relative">
                    <img className="w-full h-full object-cover" alt={upload.title || 'Para moderación'} src={upload.file_url} />
                    <div className="absolute top-2 right-2">
                      {upload.approved === true && <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">Aprobado</div>}
                      {upload.approved === false && <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">Rechazado</div>}
                      {upload.approved === null && <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">Pendiente</div>}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-medium mb-2 truncate">{upload.title || upload.file_name}</h3>
                    <div className="flex items-center text-gray-300 text-sm mb-2"><User className="w-3 h-3 mr-1" /><span className="truncate">{upload.guest_name}</span></div>
                    <div className="flex items-center text-gray-400 text-xs mb-3"><Calendar className="w-3 h-3 mr-1" /><span>{new Date(upload.uploaded_at).toLocaleDateString('es-ES')}</span></div>
                    {upload.description && <p className="text-gray-300 text-sm mb-3 line-clamp-2">{upload.description}</p>}
                    <div className="flex gap-2">
                      <Button onClick={() => setSelectedUpload(upload)} size="sm" variant="outline" className="flex-1 border-white/30 text-white hover:bg-white/10"><Eye className="w-3 h-3 mr-1" />Ver</Button>
                      {upload.approved !== true && <Button onClick={() => updateUploadStatus(upload.id, true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white"><Check className="w-3 h-3" /></Button>}
                      {upload.approved !== false && <Button onClick={() => updateUploadStatus(upload.id, false)} size="sm" className="bg-red-600 hover:bg-red-700 text-white"><X className="w-3 h-3" /></Button>}
                      <Button onClick={() => handleDelete(upload.id)} size="sm" variant="outline" className="border-red-500/50 text-red-300 hover:bg-red-500/10"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {selectedUpload && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUpload(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="aspect-video bg-black rounded-t-2xl overflow-hidden">
                  {selectedUpload.type === 'video' ? <video src={selectedUpload.file_url} controls className="w-full h-full object-contain" /> : <img className="w-full h-full object-contain" alt={selectedUpload.title || 'Para moderación'} src={selectedUpload.file_url} />}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{selectedUpload.title || selectedUpload.file_name}</h3>
                      <div className="flex items-center text-gray-300 text-sm mb-2"><User className="w-4 h-4 mr-2" /><span>{selectedUpload.guest_name}</span><Calendar className="w-4 h-4 ml-4 mr-2" /><span>{new Date(selectedUpload.uploaded_at).toLocaleDateString('es-ES')}</span></div>
                      {selectedUpload.description && <p className="text-gray-200 leading-relaxed mb-4">{selectedUpload.description}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      {selectedUpload.approved !== true && <Button onClick={() => { updateUploadStatus(selectedUpload.id, true); setSelectedUpload(null); }} className="bg-green-600 hover:bg-green-700 text-white"><Check className="w-4 h-4 mr-2" />Aprobar</Button>}
                      {selectedUpload.approved !== false && <Button onClick={() => { updateUploadStatus(selectedUpload.id, false); setSelectedUpload(null); }} className="bg-red-600 hover:bg-red-700 text-white"><X className="w-4 h-4 mr-2" />Rechazar</Button>}
                      <Button onClick={() => { handleDelete(selectedUpload.id); setSelectedUpload(null); }} variant="outline" className="border-red-500/50 text-red-300 hover:bg-red-500/10"><Trash2 className="w-4 h-4 mr-2" />Eliminar</Button>
                    </div>
                    <Button onClick={() => setSelectedUpload(null)} variant="outline" className="border-white/30 text-white hover:bg-white/10">Cerrar</Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Moderation;
