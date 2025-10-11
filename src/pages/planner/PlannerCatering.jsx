import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const CateringForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Categoría</label>
        <input type="text" placeholder="Ej: Aperitivo, Bebidas" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Plato/Bebida</label>
        <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Unidades</label>
        <input type="number" placeholder="100" value={formData.units} onChange={(e) => setFormData({...formData, units: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Costo Unitario</label>
        <input type="number" placeholder="15" value={formData.unit_cost} onChange={(e) => setFormData({...formData, unit_cost: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Costo Total</label>
        <input type="number" placeholder="1500" value={formData.total_cost} onChange={(e) => setFormData({...formData, total_cost: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Notas</label>
      <textarea placeholder="Notas adicionales" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-20" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700">Guardar</Button>
    </DialogFooter>
  </form>
);

const PlannerCatering = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ category: '', name: '', units: '', unit_cost: '', total_cost: '', notes: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_catering_items').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) toast({ title: "Error al cargar catering", variant: "destructive" });
    else setItems(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item ? { category: item.category, name: item.name, units: item.units || '', unit_cost: item.unit_cost || '', total_cost: item.total_cost || '', notes: item.notes || '' } : { category: '', name: '', units: '', unit_cost: '', total_cost: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const itemData = { ...formData, event_id: eventId };
    let error;
    if (currentItem) {
      ({ error } = await supabase.from('planner_catering_items').update(itemData).eq('id', currentItem.id));
    } else {
      ({ error } = await supabase.from('planner_catering_items').insert(itemData));
    }
    if (error) toast({ title: "Error al guardar", variant: "destructive" });
    else { toast({ title: `Elemento ${currentItem ? 'actualizado' : 'añadido'}` }); setIsModalOpen(false); fetchItems(); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("¿Seguro que quieres eliminar este elemento?")) return;
    const { error } = await supabase.from('planner_catering_items').delete().eq('id', itemId);
    if (error) toast({ title: "Error al eliminar", variant: "destructive" });
    else { toast({ title: "Elemento eliminado" }); fetchItems(); }
  };

  const groupedItems = items.reduce((acc, item) => {
    const category = item.category || 'Sin categoría';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Comida y Bebidas</h1></div>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-yellow-600 hover:bg-yellow-700"><Plus className="w-4 h-4 mr-2" />Añadir Elemento</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando...</div> :
            <div className="space-y-6">
              {Object.keys(groupedItems).length > 0 ? Object.entries(groupedItems).map(([category, catItems]) => (
                <div key={category} className="bg-white/10 p-6 rounded-2xl border border-white/20">
                  <h3 className="text-xl font-bold text-yellow-300 mb-4">{category}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead><tr className="border-b border-white/20"><th className="p-2">Nombre</th><th className="p-2">Unidades</th><th className="p-2">Costo/U</th><th className="p-2">Total</th><th className="p-2">Acciones</th></tr></thead>
                      <tbody>
                        {catItems.map(item => (
                          <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-2 font-medium">{item.name}</td>
                            <td className="p-2">{item.units || 'N/A'}</td>
                            <td className="p-2">${Number(item.unit_cost || 0).toLocaleString()}</td>
                            <td className="p-2 font-semibold">${Number(item.total_cost || 0).toLocaleString()}</td>
                            <td className="p-2"><div className="flex gap-1">
                              <Button onClick={() => handleOpenModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-blue-400"><Edit className="w-4 h-4" /></Button>
                              <Button onClick={() => handleDeleteItem(item.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                            </div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )) : <p className="text-center text-gray-400 py-16">No hay elementos de catering añadidos.</p>}
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-yellow-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentItem ? 'Editar' : 'Añadir'} Elemento</DialogTitle></DialogHeader>
          <CateringForm formData={formData} setFormData={setFormData} handleSave={handleSaveItem} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerCatering;