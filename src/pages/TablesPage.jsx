import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Table, Plus, Trash2, Edit, User, Search, UserPlus } from 'lucide-react';
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

const GuestForm = ({ eventId, onGuestCreated, closeForm }) => {
  const [formData, setFormData] = useState({ first_name: '', last_name: '', phone: '', country_code: '+57', email: '' });

  const handleSave = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.from('guests').insert({ ...formData, event_id: eventId }).select().single();
    if (error) {
      toast({ title: "Error al crear invitado", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invitado creado con éxito" });
      onGuestCreated(data);
      closeForm();
    }
  };

  return (
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
        <Button type="button" variant="ghost" onClick={closeForm}>Cancelar</Button>
        <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Guardar Invitado</Button>
      </DialogFooter>
    </form>
  );
};

const TablesPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [currentTable, setCurrentTable] = useState(null);
  const [formData, setFormData] = useState({ name: '', capacity: 10, assigned_guests: [] });
  const [guestSearch, setGuestSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: tablesData, error: tablesError } = await supabase.from('event_tables').select('*, table_assignments(guest_id)').eq('event_id', eventId);
    const { data: guestsData, error: guestsError } = await supabase.from('guests').select('*').eq('event_id', eventId);
    
    if (tablesError || guestsError) {
      toast({ title: "Error al cargar datos", description: tablesError?.message || guestsError?.message, variant: "destructive" });
    } else {
      const tablesWithGuests = tablesData.map(t => ({ ...t, assigned_guests: t.table_assignments.map(ta => ta.guest_id) }));
      setTables(tablesWithGuests);
      setGuests(guestsData);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenTableModal = (table = null) => {
    setCurrentTable(table);
    if (table) {
      setFormData({ name: table.name, capacity: table.capacity, assigned_guests: table.assigned_guests });
    } else {
      setFormData({ name: '', capacity: 10, assigned_guests: [] });
    }
    setIsTableModalOpen(true);
  };

  const handleSaveTable = async (e) => {
    e.preventDefault();
    const { name, capacity, assigned_guests } = formData;
    let table_id = currentTable?.id;

    if (currentTable) {
      const { error } = await supabase.from('event_tables').update({ name, capacity }).eq('id', currentTable.id);
      if (error) { toast({ title: "Error al actualizar mesa", variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from('event_tables').insert({ name, capacity, event_id: eventId }).select().single();
      if (error) { toast({ title: "Error al crear mesa", variant: "destructive" }); return; }
      table_id = data.id;
    }

    await supabase.from('table_assignments').delete().eq('table_id', table_id);

    if (assigned_guests.length > 0) {
      const assignments = assigned_guests.map(guest_id => ({ table_id, guest_id }));
      const { error: insertError } = await supabase.from('table_assignments').insert(assignments);
      if (insertError) {
        toast({ title: "Error al asignar invitados", description: "Un invitado ya podría estar en otra mesa.", variant: "destructive" });
      }
    }
    
    toast({ title: `Mesa ${currentTable ? 'actualizada' : 'creada'}` });
    setIsTableModalOpen(false);
    fetchData();
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta mesa?")) return;
    const { error } = await supabase.from('event_tables').delete().eq('id', tableId);
    if (error) { toast({ title: "Error al eliminar mesa", variant: "destructive" }); }
    else { toast({ title: "Mesa eliminada" }); fetchData(); }
  };

  const toggleGuestAssignment = (guestId) => {
    setFormData(prev => {
      const newAssigned = prev.assigned_guests.includes(guestId)
        ? prev.assigned_guests.filter(id => id !== guestId)
        : [...prev.assigned_guests, guestId];
      return { ...prev, assigned_guests: newAssigned };
    });
  };

  const handleGuestCreated = (newGuest) => {
    setGuests(prev => [...prev, newGuest]);
    setFormData(prev => ({ ...prev, assigned_guests: [...prev.assigned_guests, newGuest.id] }));
  };

  const assignedGuestIds = tables.flatMap(t => t.assigned_guests);
  const availableGuests = guests.filter(g => !assignedGuestIds.includes(g.id) || formData.assigned_guests.includes(g.id));
  const filteredAvailableGuests = availableGuests.filter(g => `${g.first_name} ${g.last_name}`.toLowerCase().includes(guestSearch.toLowerCase()));

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Cargando mesas...</div>;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center"><Button variant="ghost" onClick={() => navigate(`/host/${eventId}`)} className="text-white hover:bg-white/10 mr-4"><ArrowLeft /></Button><div><h1 className="text-2xl font-bold text-white">Mesas</h1><p className="text-gray-300">Organiza a tus invitados</p></div></div>
            <Button onClick={() => handleOpenTableModal()} className="bg-pink-600 hover:bg-pink-700"><Plus className="w-4 h-4 mr-2" />Crear Mesa</Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map(table => (
              <div key={table.id} className="bg-white/10 p-6 rounded-2xl border border-white/20">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white">{table.name}</h3>
                    <p className="text-pink-300">{table.assigned_guests.length} / {table.capacity} invitados</p>
                  </div>
                  <div className="flex gap-1">
                    <Button onClick={() => handleOpenTableModal(table)} size="icon" variant="ghost" className="text-blue-400 hover:bg-blue-500/20 h-8 w-8"><Edit className="w-4" /></Button>
                    <Button onClick={() => handleDeleteTable(table.id)} size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20 h-8 w-8"><Trash2 className="w-4" /></Button>
                  </div>
                </div>
                <ul className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {table.assigned_guests.map(guestId => {
                    const guest = guests.find(g => g.id === guestId);
                    return <li key={guestId} className="text-sm text-gray-200 flex items-center gap-2"><User className="w-3 h-3"/>{guest ? `${guest.first_name} ${guest.last_name}` : 'Invitado desconocido'}</li>;
                  })}
                </ul>
              </div>
            ))}
          </div>
          {tables.length === 0 && <div className="text-center py-16 text-gray-400">No hay mesas creadas.</div>}
        </motion.div>
      </div>

      <Dialog open={isTableModalOpen} onOpenChange={setIsTableModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-pink-500 text-white max-w-2xl">
          <DialogHeader><DialogTitle className="text-2xl">{currentTable ? 'Editar Mesa' : 'Crear Mesa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTable} className="grid md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Nombre o Número de Mesa</label>
                <input type="text" placeholder="Ej: Mesa 1" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Número de Personas</label>
                <input type="number" placeholder="10" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
              </div>
            </div>
            <div className="space-y-4 flex flex-col">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Asignar Invitados</h4>
                <Button type="button" size="sm" variant="outline" onClick={() => setIsGuestModalOpen(true)} className="text-purple-300 border-purple-500/50 hover:bg-purple-500/20"><UserPlus className="w-4 h-4 mr-2" />Nuevo Invitado</Button>
              </div>
              {guests.length === 0 ? <p className="text-gray-400">No se ha creado ningún invitado todavía.</p> :
              <>
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/><input type="text" placeholder="Buscar invitado..." value={guestSearch} onChange={e => setGuestSearch(e.target.value)} className="w-full p-2 pl-9 rounded bg-white/10 border border-white/20" /></div>
                <ul className="space-y-2 flex-1 overflow-y-auto p-2 bg-black/20 rounded-lg">
                  {filteredAvailableGuests.map(guest => (
                    <li key={guest.id} className="flex items-center justify-between">
                      <label htmlFor={`guest-${guest.id}`} className="flex-1 cursor-pointer">{guest.first_name} {guest.last_name}</label>
                      <input type="checkbox" id={`guest-${guest.id}`} checked={formData.assigned_guests.includes(guest.id)} onChange={() => toggleGuestAssignment(guest.id)} disabled={formData.assigned_guests.length >= formData.capacity && !formData.assigned_guests.includes(guest.id)} className="form-checkbox h-5 w-5 text-pink-500 bg-gray-800 border-gray-600 rounded focus:ring-pink-500" />
                    </li>
                  ))}
                </ul>
              </>}
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setIsTableModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-pink-600 hover:bg-pink-700">Guardar Mesa</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isGuestModalOpen} onOpenChange={setIsGuestModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-purple-500 text-white">
          <DialogHeader><DialogTitle className="text-2xl">Crear Nuevo Invitado</DialogTitle></DialogHeader>
          <GuestForm eventId={eventId} onGuestCreated={handleGuestCreated} closeForm={() => setIsGuestModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablesPage;