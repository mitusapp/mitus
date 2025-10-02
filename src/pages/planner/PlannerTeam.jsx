import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TeamForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre</label>
        <input type="text" placeholder="Nombre completo" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Rol</label>
        <input type="text" placeholder="Ej: Dama de honor, Fotógrafo" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Información de Contacto</label>
      <input type="text" placeholder="Teléfono o email" value={formData.contact_info} onChange={(e) => setFormData({...formData, contact_info: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Guardar Miembro</Button>
    </DialogFooter>
  </form>
);

const PlannerTeam = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', role: '', contact_info: '' });

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_team').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) toast({ title: "Error al cargar equipo", variant: "destructive" });
    else setTeam(data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const handleOpenModal = (item = null) => {
    setCurrentItem(item);
    setFormData(item ? { name: item.name, role: item.role, contact_info: item.contact_info || '' } : { name: '', role: '', contact_info: '' });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    const itemData = { ...formData, event_id: eventId };
    let error;
    if (currentItem) {
      ({ error } = await supabase.from('planner_team').update(itemData).eq('id', currentItem.id));
    } else {
      ({ error } = await supabase.from('planner_team').insert(itemData));
    }
    if (error) toast({ title: "Error al guardar", variant: "destructive" });
    else { toast({ title: `Miembro ${currentItem ? 'actualizado' : 'añadido'}` }); setIsModalOpen(false); fetchTeam(); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("¿Seguro que quieres eliminar a este miembro?")) return;
    const { error } = await supabase.from('planner_team').delete().eq('id', itemId);
    if (error) toast({ title: "Error al eliminar", variant: "destructive" });
    else { toast({ title: "Miembro eliminado" }); fetchTeam(); }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button>
              <div><h1 className="text-2xl font-bold text-white">Equipo y Roles</h1></div>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" />Añadir Miembro</Button>
          </div>

          {loading ? <div className="text-center text-white">Cargando...</div> :
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.map(member => (
                <div key={member.id} className="bg-white/10 p-6 rounded-2xl border border-white/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white">{member.name}</h3>
                      <p className="text-indigo-300">{member.role}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button onClick={() => handleOpenModal(member)} size="icon" variant="ghost" className="text-blue-400 hover:bg-blue-500/20 h-8 w-8"><Edit className="w-4" /></Button>
                      <Button onClick={() => handleDeleteItem(member.id)} size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20 h-8 w-8"><Trash2 className="w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-gray-300">
                    <p>{member.contact_info || 'Sin contacto'}</p>
                  </div>
                </div>
              ))}
              {team.length === 0 && <p className="text-center text-gray-400 py-16 col-span-full">No hay miembros del equipo añadidos.</p>}
            </div>
          }
        </motion.div>
      </div>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-indigo-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">{currentItem ? 'Editar' : 'Añadir'} Miembro</DialogTitle></DialogHeader>
          <TeamForm formData={formData} setFormData={setFormData} handleSave={handleSaveItem} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlannerTeam;