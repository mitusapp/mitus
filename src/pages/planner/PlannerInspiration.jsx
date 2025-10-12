import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const InspirationForm = ({ eventId, onUpload, closeModal }) => {
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
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
    if (!file || !category) {
      toast({ title: "Faltan datos", description: "Por favor, añade una categoría y un archivo.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    await onUpload({ category, notes, file });
    setIsUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Categoría</label>
        <input type="text" placeholder="Ej: Decoración, Vestuario" value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Archivo de Imagen</label>
        <div
          className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md cursor-pointer"
          onClick={() => fileInputRef.current.click()}
        >
          <div className="space-y-1 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
            <p className="pl-1">{file ? file.name : 'Haz clic para subir una imagen'}</p>
            <p className="text-xs text-gray-500">PNG, JPG, GIF (Máx 10MB)</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Notas</label>
        <textarea placeholder="Notas sobre la inspiración" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full p-3 rounded bg-white/10 border border-white/20 h-20" />
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={isUploading}>
          {isUploading ? 'Subiendo...' : 'Subir Inspiración'}
        </Button>
      </DialogFooter>
    </form>
  );
};

const PlannerInspiration = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [inspirations, setInspirations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchInspirations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_inspiration').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) toast({ title: "Error al cargar inspiraciones", variant: "destructive" });
    else setInspirations(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchInspirations(); }, [fetchInspirations]);

  const handleUpload = async ({ category, notes, file }) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${eventId}/${fileName}`;

    const { error: uploadError } = await supabase.storage.from('planner-inspiration').upload(filePath, file);
    if (uploadError) {
      toast({ title: "Error al subir imagen", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('planner-inspiration').getPublicUrl(filePath);

    const { error: dbError } = await supabase.from('planner_inspiration').insert({
      event_id: eventId,
      category,
      notes,
      image_url: publicUrl,
    });

    if (dbError) toast({ title: "Error al guardar inspiración", variant: "destructive" });
    else { toast({ title: "Inspiración subida" }); setIsModalOpen(false); fetchInspirations(); }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta inspiración?")) return;
    
    const filePath = item.image_url.split('/planner-inspiration/')[1];
    await supabase.storage.from('planner-inspiration').remove([filePath]);
    
    const { error: dbError } = await supabase.from('planner_inspiration').delete().eq('id', item.id);
    if (dbError) toast({ title: "Error al eliminar", variant: "destructive" });
    else { toast({ title: "Inspiración eliminada" }); fetchInspirations(); }
  };

  const groupedItems = inspirations.reduce((acc, item) => {
    const category = item.category || 'Sin categoría';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Tablero de Inspiración</h1></div>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="bg-teal-600 hover:bg-teal-700"><Plus className="w-4 h-4 mr-2" />Añadir Inspiración</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando...</div> :
            <div className="space-y-8">
              {Object.keys(groupedItems).length > 0 ? Object.entries(groupedItems).map(([category, catItems]) => (
                <div key={category}>
                  <h3 className="text-2xl font-bold text-teal-300 mb-4">{category}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catItems.map(item => (
                      <div key={item.id} className="group relative bg-white/10 rounded-lg overflow-hidden aspect-square">
                        <img src={item.image_url} alt={item.notes || 'Inspiración'} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                          <p className="text-sm text-gray-200">{item.notes}</p>
                          <Button onClick={() => handleDelete(item)} size="icon" variant="destructive" className="self-end h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <p className="text-center text-gray-400 py-16">No hay inspiraciones añadidas.</p>}
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-teal-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">Añadir Inspiración</DialogTitle></DialogHeader>
          <InspirationForm eventId={eventId} onUpload={handleUpload} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerInspiration;