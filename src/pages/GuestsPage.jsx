import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Users, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const countryCodes = [
  { code: '+1', name: 'USA', flag: '🇺🇸' },
  { code: '+52', name: 'MEX', flag: '🇲🇽' },
  { code: '+57', name: 'COL', flag: '🇨🇴' },
  { code: '+34', name: 'ESP', flag: '🇪🇸' },
  { code: '+54', name: 'ARG', flag: '🇦🇷' },
  { code: '+51', name: 'PER', flag: '🇵🇪' },
  { code: '+56', name: 'CHL', flag: '🇨🇱' },
];

const GuestForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre</label>
        <input type="text" placeholder="Nombre" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Apellidos</label>
        <input type="text" placeholder="Apellidos" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Whatsapp</label>
      <div className="flex">
        <select value={formData.country_code} onChange={(e) => setFormData({...formData, country_code: e.target.value})} className="p-3 rounded-l bg-white/10 border border-r-0 border-white/20 appearance-none text-center">
          {countryCodes.map(c => <option key={c.code} value={c.code}>{`${c.flag} ${c.code}`}</option>)}
        </select>
        <input type="tel" placeholder="Número de teléfono" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-r bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Correo electrónico (opcional)</label>
      <input type="email" placeholder="ejemplo@correo.com" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Guardar</Button>
    </DialogFooter>
  </form>
);

const GuestsPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentGuest, setCurrentGuest] = useState(null);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '', country_code: '+57', email: '' });

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('guests').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (error) {
      toast({ title: "Error al cargar invitados", description: error.message, variant: "destructive" });
    } else {
      setGuests(data);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleOpenModal = (guest = null) => {
    setCurrentGuest(guest);
    if (guest) {
      setFormData({ first_name: guest.first_name, last_name: guest.last_name, phone: guest.phone || '', country_code: guest.country_code || '+57', email: guest.email || '' });
    } else {
      setFormData({ first_name: '', last_name: '', phone: '', country_code: '+57', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveGuest = async (e) => {
    e.preventDefault();
    const guestData = { ...formData, event_id: eventId };
    let error;
    if (currentGuest) {
      ({ error } = await supabase.from('guests').update(guestData).eq('id', currentGuest.id));
    } else {
      ({ error } = await supabase.from('guests').insert(guestData));
    }

    if (error) {
      toast({ title: "Error al guardar invitado", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Invitado ${currentGuest ? 'actualizado' : 'creado'} con éxito` });
      setIsModalOpen(false);
      fetchGuests();
    }
  };

  const handleDeleteGuest = async (guestId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar a este invitado?")) return;
    const { error } = await supabase.from('guests').delete().eq('id', guestId);
    if (error) {
      toast({ title: "Error al eliminar invitado", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invitado eliminado" });
      fetchGuests();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Cargando invitados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Invitados</h1>
                <p className="text-gray-300">Gestiona la lista de invitados de tu evento</p>
              </div>
            </div>
            <Button onClick={() => handleOpenModal()} className="bg-purple-600 hover:bg-purple-700"><UserPlus className="w-4 h-4 mr-2" />Crear Invitado</Button>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            {guests.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay invitados todavía</h3>
                <p className="text-gray-300">Haz clic en "Crear Invitado" para empezar a añadir personas.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {guests.map(guest => (
                  <li key={guest.id} className="flex items-center justify-between bg-white/5 p-4 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{guest.first_name} {guest.last_name}</p>
                      <p className="text-sm text-gray-400">{guest.email || 'Sin email'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleOpenModal(guest)} size="icon" variant="ghost" className="text-blue-400 hover:bg-blue-500/20"><Edit className="w-4 h-4" /></Button>
                      <Button onClick={() => handleDeleteGuest(guest.id)} size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-purple-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">{currentGuest ? 'Editar Invitado' : 'Crear Invitado'}</DialogTitle>
          </DialogHeader>
          <GuestForm formData={formData} setFormData={setFormData} handleSave={handleSaveGuest} closeModal={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GuestsPage;
