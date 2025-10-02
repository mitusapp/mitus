import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Download, FileText, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DocumentForm = ({ eventId, providers, onUpload, closeModal }) => {
  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !name) {
      toast({ title: "Faltan datos", description: "Por favor, añade un nombre y un archivo.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    await onUpload({ name, provider_id: providerId || null, file });
    setIsUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Documento</label>
        <input type="text" placeholder="Ej: Contrato Fotógrafo" value={name} onChange={(e) => setName(e.target.value)} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Proveedor Asociado (Opcional)</label>
        <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="w-full p-3 rounded bg-white/10 border border-white/20">
          <option value="">Ninguno</option>
          {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Archivo</label>
        <div
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer"
          onClick={() => fileInputRef.current.click()}
        >
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <div className="flex text-sm text-gray-400">
              <p className="pl-1">{file ? file.name : 'Haz clic para subir un archivo'}</p>
            </div>
            <p className="text-xs text-gray-500">PDF, DOC, XLS, PNG, JPG, etc. (Máx 50MB)</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={isUploading}>
          {isUploading ? 'Subiendo...' : 'Subir Documento'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const PlannerDocuments = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: docData, error: docError } = await supabase
        .from('planner_documents')
        .select('*, planner_providers(name)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (docError) throw docError;
      setDocuments(docData);

      const { data: provData, error: provError } = await supabase
        .from('event_providers')
        .select('planner_providers(*)')
        .eq('event_id', eventId);
      if (provError) throw provError;
      setProviders(provData.map(p => p.planner_providers));
    } catch (error) {
      toast({ title: "Error al cargar datos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async ({ name, provider_id, file }) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${eventId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('planner-documents')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Error al subir archivo", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('planner-documents').getPublicUrl(filePath);

    const { error: dbError } = await supabase.from('planner_documents').insert({
      event_id: eventId,
      provider_id,
      name,
      file_name: file.name,
      file_url: publicUrl,
      file_size: file.size,
      file_type: file.type,
    });

    if (dbError) {
      toast({ title: "Error al guardar documento", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Documento subido con éxito" });
      setIsModalOpen(false);
      fetchDocuments();
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm("¿Seguro que quieres eliminar este documento?")) return;
    
    const filePath = doc.file_url.split('/planner-documents/')[1];
    const { error: storageError } = await supabase.storage.from('planner-documents').remove([filePath]);
    if (storageError) {
      toast({ title: "Error al eliminar archivo del almacenamiento", variant: "destructive" });
    }

    const { error: dbError } = await supabase.from('planner_documents').delete().eq('id', doc.id);
    if (dbError) {
      toast({ title: "Error al eliminar documento de la base de datos", variant: "destructive" });
    } else {
      toast({ title: "Documento eliminado" });
      fetchDocuments();
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Documentos</h1></div>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" />Subir Documento</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando documentos...</div> :
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead><tr className="border-b border-white/20"><th className="p-3">Nombre</th><th className="p-3">Proveedor</th><th className="p-3">Tamaño</th><th className="p-3">Fecha</th><th className="p-3">Acciones</th></tr></thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="p-3 font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-orange-300" />{doc.name}</td>
                        <td className="p-3 text-sm text-blue-300">{doc.planner_providers?.name || 'N/A'}</td>
                        <td className="p-3 text-sm text-gray-400">{(doc.file_size / 1024 / 1024).toFixed(2)} MB</td>
                        <td className="p-3 text-sm text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                        <td className="p-3"><div className="flex gap-2">
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Button size="icon" variant="ghost" className="h-8 w-8 text-green-400"><Download className="w-4 h-4" /></Button></a>
                          <Button onClick={() => handleDelete(doc)} size="icon" variant="ghost" className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {documents.length === 0 && <p className="text-center text-gray-400 py-8">No hay documentos subidos.</p>}
              </div>
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-orange-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">Subir Nuevo Documento</DialogTitle></DialogHeader>
          <DocumentForm eventId={eventId} providers={providers} onUpload={handleUpload} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerDocuments;