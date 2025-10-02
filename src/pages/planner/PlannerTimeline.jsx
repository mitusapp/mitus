import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TimelineForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Título del Hito</label>
      <input type="text" placeholder="Título" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Hora de Inicio</label>
      <input type="datetime-local" value={formData.start_time ? new Date(formData.start_time).toISOString().slice(0, 16) : ''} onChange={(e) => setFormData({...formData, start_time: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" style={{ colorScheme: 'dark' }} />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Descripción</label>
      <textarea placeholder="Descripción" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-24" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Guardar Hito</Button>
    </DialogFooter>
  </form>
);

const PlannerTimeline = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [timelineItems, setTimelineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ title: '', start_time: '', description: '' });

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_timeline_items').select('*').eq('event_id', eventId).order('start_time', { ascending: true });
    if (error) {
      toast({ title: "Error al cargar cronograma", variant: "destructive" });
    } else {
      setTimelineItems(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item ? { title: item.title, start_time: item.start_time, description: item.description || '' } : { title: '', start_time: '', description: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const itemData = { ...formData, event_id: eventId, start_time: new Date(formData.start_time).toISOString() };
    let error;
    if (currentItem) {
      ({ error } = await supabase.from('planner_timeline_items').update(itemData).eq('id', currentItem.id));
    } else {
      ({ error } = await supabase.from('planner_timeline_items').insert(itemData));
    }
    if (error) {
      toast({ title: "Error al guardar hito", variant: "destructive" });
    } else {
      toast({ title: `Hito ${currentItem ? 'actualizado' : 'creado'}` });
      setIsModalOpen(false);
      fetchTimeline();
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("¿Seguro que quieres eliminar este hito?")) return;
    const { error } = await supabase.from('planner_timeline_items').delete().eq('id', itemId);
    if (error) { toast({ title: "Error al eliminar hito", variant: "destructive" }); }
    else { toast({ title: "Hito eliminado" }); fetchTimeline(); }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Cronograma / Run of Show</h1></div>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-700"><Plus className="w-4 h-4 mr-2" />Nuevo Hito</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando cronograma...</div> :
            <div className="space-y-4">
              {timelineItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className="bg-purple-500/30 rounded-full p-2"><Clock className="text-purple-300 w-5 h-5" /></div>
                    {index < timelineItems.length - 1 && <div className="w-px h-full bg-white/20 my-2"></div>}
                  </div>
                  <div className="bg-white/10 p-4 rounded-lg flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-white">{new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {item.title}</p>
                        <p className="text-sm text-gray-300">{item.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleOpenModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-blue-400"><Edit className="w-4 h-4" /></Button>
                        <Button onClick={() => handleDeleteItem(item.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {timelineItems.length === 0 && <p className="text-center text-gray-400 py-16">No hay hitos en el cronograma.</p>}
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-purple-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentItem ? 'Editar Hito' : 'Crear Hito'}</DialogTitle></DialogHeader>
          <TimelineForm formData={formData} setFormData={setFormData} handleSave={handleSaveItem} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerTimeline;