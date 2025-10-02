
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ProviderForm = ({ formData, setFormData, handleSave, closeModal }) => (
  <form onSubmit={handleSave} className="space-y-4 py-4">
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nombre del Proveedor</label>
        <input type="text" placeholder="Nombre" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Tipo de Servicio</label>
        <input type="text" placeholder="Ej: Fotografía, Catering" value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})} required className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Teléfono</label>
        <input type="tel" placeholder="Teléfono" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
        <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20" />
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-200 mb-2">Notas</label>
      <textarea placeholder="Notas adicionales" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full p-3 rounded bg-white/10 border border-white/20 h-24" />
    </div>
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar Proveedor</Button>
    </DialogFooter>
  </form>
);

const AssignProviderModal = ({ allProviders, eventProviders, onAssign, onUnassign, closeModal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const eventProviderIds = eventProviders.map(p => p.id);

  const filteredProviders = allProviders.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.service_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="py-4">
      <input
        type="text"
        placeholder="Buscar proveedor..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full p-3 rounded bg-white/10 border border-white/20 mb-4"
      />
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredProviders.map(provider => {
          const isAssigned = eventProviderIds.includes(provider.id);
          return (
            <div key={provider.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
              <div>
                <p className="font-semibold text-white">{provider.name}</p>
                <p className="text-sm text-gray-400">{provider.service_type}</p>
              </div>
              <Button
                variant={isAssigned ? "destructive" : "secondary"}
                onClick={() => isAssigned ? onUnassign(provider.id) : onAssign(provider.id)}
              >
                {isAssigned ? 'Desasignar' : 'Asignar'}
              </Button>
            </div>
          );
        })}
      </div>
      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={closeModal}>Cerrar</Button>
      </DialogFooter>
    </div>
  );
};

const PlannerProviders = ({ isGlobal = false }) => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [allProviders, setAllProviders] = useState([]);
  const [eventProviders, setEventProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(null);
  const [formData, setFormData] = useState({ name: '', service_type: '', phone: '', email: '', notes: '' });

  const fetchAllProviders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('planner_providers').select('*');
    if (error) toast({ title: "Error al cargar directorio", description: error.message, variant: "destructive" });
    else setAllProviders(data);
    setLoading(false);
  }, []);

  const fetchEventProviders = useCallback(async () => {
    if (isGlobal || !eventId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('event_providers')
      .select('provider_id, planner_providers(*)')
      .eq('event_id', eventId);
    
    if (error) {
      toast({ title: "Error al cargar proveedores del evento", description: error.message, variant: "destructive" });
    } else {
      setEventProviders(data.map(item => item.planner_providers).filter(Boolean));
    }
    setLoading(false);
  }, [eventId, isGlobal]);

  useEffect(() => {
    fetchAllProviders();
    if (!isGlobal)fetchEventProviders();
  }, [fetchAllProviders, fetchEventProviders, isGlobal]);

  const handleOpenFormModal = (provider = null) => {
    setCurrentProvider(provider);
    if (provider) {
      setFormData({ name: provider.name, service_type: provider.service_type, phone: provider.phone || '', email: provider.email || '', notes: provider.notes || '' });
    } else {
      setFormData({ name: '', service_type: '', phone: '', email: '', notes: '' });
    }
    setIsFormModalOpen(true);
  };

  const handleSaveProvider = async (e) => {
    e.preventDefault();
    const providerData = { ...formData };
    let error;
    if (currentProvider) {
      ({ error } = await supabase.from('planner_providers').update(providerData).eq('id', currentProvider.id));
    } else {
      ({ error } = await supabase.from('planner_providers').insert(providerData));
    }

    if (error) {
      toast({ title: "Error al guardar proveedor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Proveedor ${currentProvider ? 'actualizado' : 'creado'} con éxito` });
      setIsFormModalOpen(false);
      fetchAllProviders();
    }
  };

  const handleDeleteProvider = async (providerId) => {
    if (!window.confirm("¿Estás seguro de que quieres eliminar a este proveedor del directorio global?")) return;
    const { error } = await supabase.from('planner_providers').delete().eq('id', providerId);
    if (error) {
      toast({ title: "Error al eliminar proveedor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proveedor eliminado" });
      fetchAllProviders();
      if (!isGlobal) fetchEventProviders();
    }
  };

  const handleAssignProvider = async (providerId) => {
    const { error } = await supabase.from('event_providers').insert({ event_id: eventId, provider_id: providerId });
    if (error) {
      toast({ title: "Error al asignar proveedor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proveedor asignado al evento" });
      fetchEventProviders();
    }
  };

  const handleUnassignProvider = async (providerId) => {
    const { error } = await supabase.from('event_providers').delete().match({ event_id: eventId, provider_id: providerId });
    if (error) {
      toast({ title: "Error al desasignar proveedor", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Proveedor desasignado del evento" });
      fetchEventProviders();
    }
  };

  const providersToDisplay = isGlobal ? allProviders : eventProviders;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando proveedores...</p>
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
              {!isGlobal && (
                <Button variant="ghost" onClick={() => navigate(`/host/${eventId}/planner`)} className="text-white hover:bg-white/10 mr-4">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-white">{isGlobal ? 'Directorio de Proveedores' : 'Proveedores del Evento'}</h1>
                <p className="text-gray-300">{isGlobal ? 'Gestiona todos tus proveedores guardados' : 'Proveedores asignados a este evento'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleOpenFormModal()} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Crear Nuevo</Button>
              {!isGlobal && (
                <Button onClick={() => setIsAssignModalOpen(true)} className="bg-green-600 hover:bg-green-700"><UserPlus className="w-4 h-4 mr-2" />Asignar Existente</Button>
              )}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            {providersToDisplay.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No hay proveedores</h3>
                <p className="text-gray-300">{isGlobal ? 'Empieza creando un nuevo proveedor.' : 'Asigna proveedores desde tu directorio global o crea uno nuevo.'}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {providersToDisplay.map(provider => (
                  <li key={provider.id} className="flex items-center justify-between bg-white/5 p-4 rounded-lg">
                    <div>
                      <p className="font-semibold text-white">{provider.name}</p>
                      <p className="text-sm text-gray-400">{provider.service_type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => handleOpenFormModal(provider)} size="icon" variant="ghost" className="text-blue-400 hover:bg-blue-500/20"><Edit className="w-4 h-4" /></Button>
                      <Button onClick={() => handleDeleteProvider(provider.id)} size="icon" variant="ghost" className="text-red-400 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </div>

      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-blue-500 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">{currentProvider ? 'Editar Proveedor' : 'Crear Proveedor'}</DialogTitle>
          </DialogHeader>
          <ProviderForm formData={formData} setFormData={setFormData} handleSave={handleSaveProvider} closeModal={() => setIsFormModalOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {!isGlobal && (
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent className="bg-slate-800/90 backdrop-blur-sm border-green-500 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl">Asignar Proveedor al Evento</DialogTitle>
            </DialogHeader>
            <AssignProviderModal
              allProviders={allProviders}
              eventProviders={eventProviders}
              onAssign={handleAssignProvider}
              onUnassign={handleUnassignProvider}
              closeModal={() => setIsAssignModalOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PlannerProviders;
