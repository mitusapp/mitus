import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Gift, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const GiftForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Tipo de Regalo</label>
        <input type="text" placeholder="Ej: Dinero, Objeto" value={formData.gift_type} onChange={(e) => setFormData({...formData, gift_type: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Remitente</label>
        <input type="text" placeholder="Nombre del invitado" value={formData.sender} onChange={(e) => setFormData({...formData, sender: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Valor Estimado</label>
      <input type="number" placeholder="100" value={formData.value} onChange={(e) => setFormData({...formData, value: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Notas</label>
      <textarea placeholder="Notas adicionales" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-20" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-pink-600 hover:bg-pink-700">Guardar Regalo</Button>
    </DialogFooter>
  </form>
);

const PlannerGifts = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ gift_type: '', sender: '', value: '', notes: '' });

  const fetchGifts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_gifts').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) toast({ title: "Error al cargar regalos", variant: "destructive" });
    else setGifts(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchGifts(); }, [fetchGifts]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item ? { gift_type: item.gift_type, sender: item.sender || '', value: item.value || '', notes: item.notes || '' } : { gift_type: '', sender: '', value: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const itemData = { ...formData, event_id: eventId };
    let error;
    if (currentItem) {
      ({ error } = await supabase.from('planner_gifts').update(itemData).eq('id', currentItem.id));
    } else {
      ({ error } = await supabase.from('planner_gifts').insert(itemData));
    }
    if (error) toast({ title: "Error al guardar", variant: "destructive" });
    else { toast({ title: `Regalo ${currentItem ? 'actualizado' : 'añadido'}` }); setIsModalOpen(false); fetchGifts(); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("¿Seguro que quieres eliminar este regalo?")) return;
    const { error } = await supabase.from('planner_gifts').delete().eq('id', itemId);
    if (error) toast({ title: "Error al eliminar", variant: "destructive" });
    else { toast({ title: "Regalo eliminado" }); fetchGifts(); }
  };

  const toggleThankYou = async (item) => {
    const { error } = await supabase.from('planner_gifts').update({ thank_you_sent: !item.thank_you_sent }).eq('id', item.id);
    if (error) toast({ title: "Error al actualizar", variant: "destructive" });
    else fetchGifts();
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Regalos y Agradecimientos</h1></div>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-pink-600 hover:bg-pink-700"><Plus className="w-4 h-4 mr-2" />Añadir Regalo</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando...</div> :
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead><tr className="border-b border-white/20"><th className="p-3">Regalo</th><th className="p-3">Remitente</th><th className="p-3">Valor Est.</th><th className="p-3">Agradecimiento</th><th className="p-3">Acciones</th></tr></thead>
                  <tbody>
                    {gifts.map(item => (
                      <tr key={item.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="p-3 font-medium">{item.gift_type}</td>
                        <td className="p-3">{item.sender || 'Anónimo'}</td>
                        <td className="p-3">${Number(item.value || 0).toLocaleString()}</td>
                        <td className="p-3">
                          <button onClick={() => toggleThankYou(item)} className="flex items-center gap-2">
                            {item.thank_you_sent ? <CheckCircle className="text-green-400" /> : <Circle className="text-gray-400" />}
                            <span className={item.thank_you_sent ? 'text-green-300' : 'text-gray-300'}>{item.thank_you_sent ? 'Enviado' : 'Pendiente'}</span>
                          </button>
                        </td>
                        <td className="p-3"><div className="flex gap-1">
                          <Button onClick={() => handleOpenModal(item)} size="icon" variant="ghost" className="h-8 w-8 text-blue-400"><Edit className="w-4 h-4" /></Button>
                          <Button onClick={() => handleDeleteItem(item.id)} size="icon" variant="ghost" className="h-8 w-8 text-red-400"><Trash2 className="w-4 h-4" /></Button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {gifts.length === 0 && <p className="text-center text-gray-400 py-8">No hay regalos registrados.</p>}
              </div>
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-pink-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentItem ? 'Editar' : 'Añadir'} Regalo</DialogTitle></DialogHeader>
          <GiftForm formData={formData} setFormData={setFormData} handleSave={handleSaveItem} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerGifts;