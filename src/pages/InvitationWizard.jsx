
/* eslint-disable react/no-unknown-property */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PartyPopper, Cake, Briefcase, Baby, Gift, Star, Heart, User, MessageSquare, Calendar, MapPin, List, Image as ImageIcon, LayoutTemplate, Home, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const eventTypes = [
  { name: 'Boda', icon: <Heart className="w-8 h-8" />, key: 'boda' },
  { name: 'Quince Años', icon: <PartyPopper className="w-8 h-8" />, key: 'quince' },
  { name: 'Cumpleaños', icon: <Cake className="w-8 h-8" />, key: 'cumpleanos' },
  { name: 'Corporativo', icon: <Briefcase className="w-8 h-8" />, key: 'corporativo' },
  { name: 'Baby Shower', icon: <Baby className="w-8 h-8" />, key: 'babyshower' },
  { name: 'Aniversario', icon: <Gift className="w-8 h-8" />, key: 'aniversario' },
  { name: 'Otro', icon: <Star className="w-8 h-8" />, key: 'otro' },
];

const templates = [
  { id: 'template1', name: 'Clásico Elegante', img: 'https://images.unsplash.com/photo-1532703108232-56de2c3b3d93?q=80&w=800' },
  { id: 'template2', name: 'Moderno Minimalista', img: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=800' },
  { id: 'template3', name: 'Rústico Floral', img: 'https://images.unsplash.com/photo-1520853535936-c935b892a296?q=80&w=800' },
];

export const wizardSteps = [
  { id: 1, title: 'Tipo de Evento', icon: <PartyPopper /> },
  { id: 2, title: 'Anfitriones y Evento', icon: <User /> },
  { id: 3, title: 'Mensaje Inicial', icon: <MessageSquare /> },
  { id: 4, title: 'Mensaje de Invitación', icon: <MessageSquare /> },
  { id: 5, title: 'Fecha y Hora', icon: <Calendar /> },
  { id: 6, title: 'Ubicaciones', icon: <MapPin /> },
  { id: 7, title: 'Indicaciones', icon: <List /> },
  { id: 8, title: 'Imagen del Evento', icon: <ImageIcon /> },
  { id: 9, title: 'Plantilla', icon: <LayoutTemplate /> },
];

const initialData = {
  eventType: '',
  hosts: '',
  eventName: '',
  initialMessage: '',
  invitationMessage: '',
  eventDate: '',
  eventTime: '',
  locations: [{
    title: 'Ceremonia',
    time: '',
    address: '',
  }],
  indications: [''],
  template: 'template1',
};

const LocationForm = ({ locations, setFormData }) => {
  const handleLocationChange = (index, field, value) => {
    const newLocations = [...locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setFormData(prev => ({ ...prev, locations: newLocations }));
  };

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [
        ...prev.locations,
        { title: '', time: '', address: '' }
      ]
    }));
  };

  return (
    <div className="space-y-4">
      {locations.map((loc, index) => (
        <div key={index} className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
          <input
            type="text"
            value={loc.title}
            onChange={(e) => handleLocationChange(index, 'title', e.target.value)}
            placeholder="Título (ej: Ceremonia)"
            className="w-full p-2 bg-white/10 rounded text-white"
          />
          <input
            type="time"
            value={loc.time}
            onChange={(e) => handleLocationChange(index, 'time', e.target.value)}
            className="w-full p-2 bg-white/10 rounded text-white"
            style={{ colorScheme: 'dark' }}
          />
          <textarea
            value={loc.address}
            onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
            placeholder="Dirección completa del lugar"
            className="w-full p-2 bg-white/10 rounded text-white h-24"
          />
        </div>
      ))}
      <Button onClick={addLocation} variant="outline" className="border-white/30 text-white hover:bg-white/10">
        Añadir otra ubicación
      </Button>
    </div>
  );
};

const InvitationWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  const [step, setStep] = useState(() => {
    const params = new URLSearchParams(location.search);
    const stepParam = parseInt(params.get('step'), 10);
    return stepParam && stepParam >= 1 && stepParam <= wizardSteps.length ? stepParam : 1;
  });

  const [formData, setFormData] = useState(() => {
    try {
      const savedData = localStorage.getItem('wizardFormData');
      const parsedData = savedData ? JSON.parse(savedData) : initialData;
      if (parsedData.locations) {
        parsedData.locations = parsedData.locations.map(loc => ({
          title: loc.title || '',
          time: loc.time || '',
          address: loc.address || '',
        }));
      }
      return parsedData;
    } catch {
      return initialData;
    }
  });

  const [imagePreview, setImagePreview] = useState(() => {
    try {
      return sessionStorage.getItem('wizardImagePreview') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) setEditingEventId(editId);
  }, [location.search]);

  useEffect(() => {
    try { localStorage.setItem('wizardFormData', JSON.stringify(formData)); }
    catch { toast({ title: "Error al guardar", variant: "destructive" }); }
  }, [formData]);

  useEffect(() => {
    try {
      if (imagePreview) sessionStorage.setItem('wizardImagePreview', imagePreview);
      else sessionStorage.removeItem('wizardImagePreview');
    } catch {
      toast({ title: "Error al guardar imagen", variant: "destructive" });
      setImagePreview('');
    }
  }, [imagePreview]);

  const saveEvent = async (isUpdate) => {
    if (!user) {
      toast({ title: "Error de autenticación", description: "Debes iniciar sesión para guardar.", variant: "destructive" });
      return null;
    }
    setIsSubmitting(true);
    try {
      let cover_image_url = imagePreview && imagePreview.startsWith('https://') ? imagePreview : null;
      if (imagePreview && !imagePreview.startsWith('https://')) {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        const fileExt = blob.type.split('/')[1] || 'png';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `public/${editingEventId || 'new'}/${fileName}`;
        let { error: uploadError } = await supabase.storage.from('event-covers').upload(filePath, blob, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('event-covers').getPublicUrl(filePath);
        cover_image_url = urlData.publicUrl;
      }
      const eventData = {
        title: formData.eventName,
        date: formData.eventDate,
        event_type: formData.eventType,
        cover_image_url,
        user_id: user.id,
        invitation_details: {
          hosts: formData.hosts.split(/&|y/i).map(h => h.trim()),
          welcome_message: formData.initialMessage,
          invitation_text: formData.invitationMessage,
          event_time: formData.eventTime,
          locations: formData.locations,
          indications: formData.indications,
          template: formData.template,
          countdown: true,
        },
      };
      let error, eventId = editingEventId;
      if (isUpdate) ({ error } = await supabase.from('events').update(eventData).eq('id', editingEventId));
      else {
        eventId = Math.random().toString(36).substr(2, 8).toUpperCase();
        ({ error } = await supabase.from('events').insert({ ...eventData, id: eventId }));
      }
      if (error) throw error;
      if (!isUpdate) {
        localStorage.removeItem('wizardFormData');
        sessionStorage.removeItem('wizardImagePreview');
      }
      toast({ title: `¡Evento ${isUpdate ? 'actualizado' : 'creado'}!`, description: "Tu evento ha sido guardado." });
      return eventId;
    } catch (err) {
      console.error('Error saving event:', err);
      toast({ title: "Error al guardar evento", description: err.message, variant: "destructive" });
      return null;
    } finally { setIsSubmitting(false); }
  };

  const updateStep = (newStep) => {
    setStep(newStep);
    const params = new URLSearchParams(location.search);
    params.set('step', newStep);
    navigate(`?${params.toString()}`, { replace: true });
  };
  const nextStep = () => updateStep(Math.min(step + 1, wizardSteps.length));
  const prevStep = () => updateStep(Math.max(step - 1, 1));

  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleIndicationChange = (i, e) => setFormData(prev => ({ ...prev, indications: prev.indications.map((ind, idx) => idx === i ? e.target.value : ind) }));
  const addIndication = () => setFormData(prev => ({ ...prev, indications: [...prev.indications, ''] }));
  const handleImageChange = (e) => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result); reader.readAsDataURL(e.target.files[0]); } };

  const handleSaveAndContinue = async () => { const id = await saveEvent(true); if (id) nextStep(); };
  const handleSaveAndExit = async () => { const id = await saveEvent(true); if (id) navigate(`/host/${id}`); };
  const finishWizard = async () => {
    if (editingEventId) { const id = await saveEvent(true); if (id) navigate(`/host/${id}`); }
    else {
      toast({ title: "¡Vista previa lista!", description: "Revisa tu invitación." });
      navigate('/preview');
    }
  };
  
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {eventTypes.map(type => (
            <motion.div key={type.key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setFormData(p => ({ ...p, eventType: type.key })); nextStep(); }}
              className={`bg-white/5 rounded-2xl p-6 border-2 ${formData.eventType === type.key ? 'border-purple-500' : 'border-white/20'} text-center cursor-pointer`}>
              <div className="text-purple-300 mb-4">{type.icon}</div><h3 className="text-xl text-white">{type.name}</h3>
            </motion.div>
          ))}
        </div>);
      case 2: return (<div className="space-y-4">
        <input type="text" name="hosts" value={formData.hosts} onChange={handleInputChange} placeholder="Nombres anfitriones" className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white" />
        <input type="text" name="eventName" value={formData.eventName} onChange={handleInputChange} placeholder="Nombre del evento" className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white" />
      </div>);
      case 3: return (<textarea name="initialMessage" value={formData.initialMessage} onChange={handleInputChange} placeholder="Mensaje inicial" className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white h-32" />);
      case 4: return (<textarea name="invitationMessage" value={formData.invitationMessage} onChange={handleInputChange} placeholder="Texto invitación" className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white h-40" />);
      case 5: return (<div className="flex flex-col md:flex-row gap-4">
        <input type="date" name="eventDate" value={formData.eventDate} onChange={handleInputChange} className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white" style={{colorScheme: 'dark'}}/>
        <input type="time" name="eventTime" value={formData.eventTime} onChange={handleInputChange} className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white" style={{colorScheme: 'dark'}}/>
      </div>);
      case 6: return <LocationForm locations={formData.locations} setFormData={setFormData} />;
      case 7: return (<div className="space-y-3">
        {formData.indications.map((ind, i) => <input key={i} type="text" value={ind} onChange={(e) => handleIndicationChange(i, e)} placeholder="Indicación" className="w-full p-2 bg-white/10 rounded-lg text-white" />)}
        <Button onClick={addIndication} variant="outline" className="border-white/30 text-white hover:bg-white/10">Añadir indicación</Button>
      </div>);
      case 8: return (<div><input type="file" accept="image/*" onChange={handleImageChange} className="w-full p-3 bg-white/10 border-white/20 rounded-lg text-white" />
        {imagePreview && <img src={imagePreview} alt="Vista previa" className="mt-4 rounded-lg max-h-60 mx-auto" />}</div>);
      case 9: return (<div className="grid md:grid-cols-3 gap-6">
        {templates.map(t => (<div key={t.id} onClick={() => setFormData(p => ({ ...p, template: t.id }))} className={`rounded-lg overflow-hidden border-4 ${formData.template === t.id ? 'border-purple-500' : 'border-transparent'} cursor-pointer`}>
          <img src={t.img} alt={t.name} className="w-full h-40 object-cover" /><p className="text-center p-2 bg-white/10 text-white">{t.name}</p>
        </div>))}
      </div>);
      default: return null;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">{editingEventId ? 'Editar Invitación' : 'Crea tu Invitación'}</h1>
          <Button onClick={() => navigate(editingEventId ? `/host/${editingEventId}` : '/')} variant="ghost" size="icon" className="text-white hover:bg-white/10"><Home /></Button>
        </div>
        <div className="flex justify-center mb-8 space-x-2 md:space-x-4">
          {wizardSteps.map(s => (<div key={s.id} onClick={() => updateStep(s.id)} title={s.title} className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all duration-300 hover:scale-110 hover:border-purple-400 ${step >= s.id ? 'bg-purple-600 border-purple-600' : 'bg-gray-700/50 border-gray-500'}`}>{React.cloneElement(s.icon, {className: "w-4 h-4 md:w-5 md:h-5"})}</div>))}
        </div>
        <div className="bg-white/5 rounded-2xl p-6 border border-white/20 min-h-[300px]">
          <h2 className="text-xl font-semibold text-white mb-4">{wizardSteps[step - 1].title}</h2>
          <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{duration: 0.3}}>{renderStep()}</motion.div></AnimatePresence>
        </div>
        <div className="flex justify-between mt-8">
          <Button onClick={prevStep} disabled={step === 1} variant="outline" className="border-white/30 text-white hover:bg-white/10 disabled:opacity-50"><ArrowLeft className="mr-2"/> Anterior</Button>
          {editingEventId ? (
            <div className="flex gap-2">
              <Button onClick={handleSaveAndExit} className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}> <Save className="mr-2 h-4 w-4"/> Guardar y Salir</Button>
              {step < wizardSteps.length
                ? <Button onClick={handleSaveAndContinue} className="bg-purple-600 hover:bg-purple-700" disabled={isSubmitting}>Guardar y Continuar <ArrowRight className="ml-2"/></Button>
                : <Button onClick={finishWizard} className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Finalizar Edición'}</Button>}
            </div>
          ) : (
            step < wizardSteps.length
              ? <Button onClick={nextStep} className="bg-purple-600 hover:bg-purple-700">Siguiente <ArrowRight className="ml-2"/></Button>
              : <Button onClick={finishWizard} className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : 'Finalizar y Ver Previa'}</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationWizard;
  