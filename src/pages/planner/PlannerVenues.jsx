import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const VenueForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Lugar</label>
        <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Capacidad</label>
        <input type="number" placeholder="150" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Costo Estimado</label>
        <input type="number" placeholder="5000" value={formData.estimated_cost} onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Ubicación</label>
        <input type="text" placeholder="Dirección" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Pros</label>
      <textarea placeholder="Puntos a favor" value={formData.pros} onChange={(e) => setFormData({...formData, pros: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-20" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Contras</label>
      <textarea placeholder="Puntos en contra" value={formData.cons} onChange={(e) => setFormData({...formData, cons: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-20" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-red-600 hover:bg-red-700">Guardar Lugar</Button>
    </DialogFooter>
  </form>
);

const PlannerVenues = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: '', estimated_cost: '', location: '', pros: '', cons: '' });

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_venues').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) toast({ title: "Error al cargar lugares", variant: "destructive" });
    else setVenues(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item ? { name: item.name, capacity: item.capacity || '', estimated_cost: item.estimated_cost || '', location: item.location || '', pros: item.pros || '', cons: item.cons || '' } : { name: '', capacity: '', estimated_cost: '', location: '', pros: '', cons: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const itemData = { ...formData, event_id: eventId };
    let error;
    if (currentItem) {
      ({ error } = await supabase.from('planner_venues').update(itemData).eq('id', currentItem.id));
    } else {
      ({ error } = await supabase.from('planner_venues').insert(itemData));
    }
    if (error) toast({ title: "Error al guardar lugar", variant: "destructive" });
    else { toast({ title: `Lugar ${currentItem ? 'actualizado' : 'añadido'}` }); setIsModalOpen(false); fetchVenues(); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("¿Seguro que quieres eliminar este lugar?")) return;
    const { error } = await supabase.from('planner_venues').delete().eq('id', itemId);
    if (error) toast({ title: "Error al eliminar lugar", variant: "destructive" });
    else { toast({ title: "Lugar eliminado" }); fetchVenues(); }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Opciones de Lugar</h1></div>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-red-600 hover:bg-red-700"><Plus className="w-4 h-4 mr-2" />Añadir Lugar</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando lugares...</div> :
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map(venue => (
                <div key={venue.id} className="bg-white/10 p-6 rounded-2xl border border-white/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{venue.name}</h3>
                      <p className="text-sm text-red-300">{venue.location}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button onClick={() => handleOpenModal(venue)} size="icon" variant="ghost" className="text-blue-400 hover:bg-blue-500/20 h-8 w-8"><Edit className="w-4" /></Button>
                      <Button onClick={() => handleDeleteItem(venue.id)} size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20 h-8 w-8"><Trash2 className="w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-gray-300">
                    <p>Capacidad: {venue.capacity || 'N/A'}</p>
                    <p>Costo Est.: ${Number(venue.estimated_cost || 0).toLocaleString()}</p>
                    <div className="pt-2">
                      <p className="font-semibold text-green-300">Pros:</p>
                      <p>{venue.pros || 'N/A'}</p>
                    </div>
                    <div className="pt-2">
                      <p className="font-semibold text-orange-300">Contras:</p>
                      <p>{venue.cons || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {venues.length === 0 && <p className="text-center text-gray-400 py-16 col-span-full">No hay lugares añadidos.</p>}
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-red-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentItem ? 'Editar Lugar' : 'Añadir Lugar'}</DialogTitle></DialogHeader>
          <VenueForm formData={formData} setFormData={setFormData} handleSave={handleSaveItem} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerVenues;