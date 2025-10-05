/* eslint-disable react/no-unknown-property */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, PartyPopper, Cake, Briefcase, Baby, Gift, Star, Heart,
  User, MessageSquare, Calendar, MapPin, List, Image as ImageIcon, LayoutTemplate,
  Home, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { fetchPredictions, fetchPlaceDetails } from '@/lib/googlePlaces';

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
    city: '',
    state: '',
    country: '',
    lat: null,
    lng: null,
  }],
  indications: [''],
  template: 'template1',
};

/* ============================
   COMPONENTE: UBICACIONES (igual que el original, con estilos claros)
   ============================ */
const LocationForm = ({ locations, setFormData }) => {
  // predicciones por input (index -> array de predicciones)
  const [predictions, setPredictions] = useState({});

  const handleLocationChange = (index, field, value) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, locations: updated }));

    // Cuando escribe dirección, disparamos autocomplete
    if (field === 'address') {
      if ((value || '').length > 2) {
        fetchPredictions(value)
          .then(results => setPredictions(prev => ({ ...prev, [index]: results })))
          .catch(() => setPredictions(prev => ({ ...prev, [index]: [] })));
      } else {
        setPredictions(prev => ({ ...prev, [index]: [] }));
      }
    }
  };

  const handleSelectPrediction = async (index, place) => {
    const details = await fetchPlaceDetails(place.placeId);
    if (!details) return;

    const comps = details.addressComponents || [];
    const getComp = (type) =>
      comps.find((c) => c.types?.includes(type))?.longText || '';

    const newLocations = [...locations];
    newLocations[index] = {
      ...newLocations[index],
      address: details.formattedAddress || '',
      city: getComp('locality'),
      state: getComp('administrative_area_level_1'),
      country: getComp('country'),
      lat: details.location?.latitude || null,
      lng: details.location?.longitude || null,
    };

    setFormData((prev) => ({ ...prev, locations: newLocations }));
    setPredictions((prev) => ({ ...prev, [index]: [] })); // cerrar dropdown
  };

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [
        ...prev.locations,
        { title: '', time: '', address: '', city: '', state: '', country: '', lat: null, lng: null },
      ],
    }));
  };

  return (
    <div className="space-y-4">
      {locations.map((loc, index) => (
        <div key={index} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 relative">
          <input
            type="text"
            value={loc.title}
            onChange={(e) => handleLocationChange(index, 'title', e.target.value)}
            placeholder="Título (ej: Ceremonia)"
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
          <input
            type="time"
            value={loc.time}
            onChange={(e) => handleLocationChange(index, 'time', e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
          <input
            type="text"
            value={loc.address}
            onChange={(e) => handleLocationChange(index, 'address', e.target.value)}
            placeholder="Buscar lugar o dirección"
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />

          {/* Dropdown de sugerencias */}
          {predictions[index]?.length > 0 && (
            <ul className="absolute bg-white border border-slate-200 rounded-xl mt-1 w-full z-10 max-h-56 overflow-y-auto shadow-lg">
              {predictions[index].map((p, i) => (
                <li
                  key={`${p.placeId}-${i}`}
                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                  onClick={() => handleSelectPrediction(index, p)}
                >
                  {p.mainText} {p.secondaryText && <span className="opacity-70">– {p.secondaryText}</span>}
                </li>
              ))}
            </ul>
          )}

          {/* Mapa preview */}
          {loc.lat && loc.lng && (
            <div className="w-full h-48 rounded-xl overflow-hidden border border-slate-200">
              <iframe
                title={`map-${index}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps/embed/v1/view?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&center=${loc.lat},${loc.lng}&zoom=15`}
              />
            </div>
          )}
        </div>
      ))}

      <Button
        onClick={addLocation}
        variant="outline"
        className="border-slate-300 text-slate-700 hover:bg-slate-50"
      >
        Añadir otra ubicación
      </Button>
    </div>
  );
};

/* ============================
   WIZARD PRINCIPAL (manteniendo pasos, campos y guardado)
   ============================ */
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
          city: loc.city || '',
          state: loc.state || '',
          country: loc.country || '',
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
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
    try {
      localStorage.setItem('wizardFormData', JSON.stringify(formData));
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    }
  }, [formData]);

  useEffect(() => {
    try {
      if (imagePreview) sessionStorage.setItem('wizardImagePreview', imagePreview);
      else sessionStorage.removeItem('wizardImagePreview');
    } catch {
      toast({ title: 'Error al guardar imagen', variant: 'destructive' });
      setImagePreview('');
    }
  }, [imagePreview]);

  const shortEventId = () => (
    crypto?.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase() :
    Math.random().toString(36).slice(2, 10).toUpperCase()
  );

  // 💡 Normaliza "hosts" para aceptar string o array (evita error split is not a function)
  const normalizeHosts = (val) => {
    if (Array.isArray(val)) return val.map((h) => String(h).trim()).filter(Boolean);
    return String(val || '').split(/\s*(?:&|y)\s*/i).map((h) => h.trim()).filter(Boolean);
  };

  const saveEvent = async (isUpdate) => {
    if (!user) {
      toast({
        title: 'Error de autenticación',
        description: 'Debes iniciar sesión para guardar.',
        variant: 'destructive',
      });
      return null;
    }
    setIsSubmitting(true);

    try {
      // Generar/usar id antes de subir imagen para carpeta correcta
      const eventId = isUpdate ? editingEventId : shortEventId();

      let cover_image_url = imagePreview && imagePreview.startsWith('https://') ? imagePreview : null;

      if (imagePreview && !imagePreview.startsWith('https://')) {
        const response = await fetch(imagePreview);
        const blob = await response.blob();
        const fileExt = blob.type.split('/')[1] || 'png';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `public/${eventId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-covers')
          .upload(filePath, blob, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('event-covers')
          .getPublicUrl(filePath);
        cover_image_url = urlData.publicUrl;
      }

      const eventData = {
        title: formData.eventName,
        date: formData.eventDate,
        event_type: formData.eventType,
        cover_image_url,
        user_id: user.id,
        invitation_details: {
          hosts: normalizeHosts(formData.hosts),
          welcome_message: formData.initialMessage,
          invitation_text: formData.invitationMessage,
          event_time: formData.eventTime,
          locations: formData.locations,
          indications: formData.indications,
          template: formData.template,
          countdown: true,
        },
      };

      let error;
      let finalId = eventId;

      if (isUpdate) {
        ({ error } = await supabase.from('events').update({ id: finalId, ...eventData }).eq('id', finalId));
      } else {
        ({ error } = await supabase.from('events').insert({ id: finalId, ...eventData }));
      }

      if (error) throw error;

      if (!isUpdate) {
        localStorage.removeItem('wizardFormData');
        sessionStorage.removeItem('wizardImagePreview');
      }

      toast({
        title: `¡Evento ${isUpdate ? 'actualizado' : 'creado'}!`,
        description: 'Tu evento ha sido guardado.',
      });

      return finalId;
    } catch (err) {
      console.error('Error saving event:', err);
      toast({ title: 'Error al guardar evento', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStep = (newStep) => {
    setStep(newStep);
    const params = new URLSearchParams(location.search);
    params.set('step', newStep);
    navigate(`?${params.toString()}`, { replace: true });
  };
  const nextStep = () => updateStep(Math.min(step + 1, wizardSteps.length));
  const prevStep = () => updateStep(Math.max(step - 1, 1));

  const handleInputChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleIndicationChange = (i, e) =>
    setFormData((prev) => ({
      ...prev,
      indications: prev.indications.map((ind, idx) => (idx === i ? e.target.value : ind)),
    }));

  const addIndication = () =>
    setFormData((prev) => ({ ...prev, indications: [...prev.indications, ''] }));

  const handleImageChange = (e) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  // En edición: guardar y volver
  const handleSaveAndExit = async () => {
    const id = await saveEvent(true);
    if (id) navigate(-1);
  };

  // En creación, se mantiene el flujo original
  const finishWizard = async () => {
    if (editingEventId) {
      const id = await saveEvent(true);
      if (id) navigate(`/host/${id}`);
    } else {
      const id = await saveEvent(false);
      if (id) {
        toast({ title: '¡Vista previa lista!', description: 'Revisa tu invitación.' });
        navigate('/preview');
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {eventTypes.map((type) => (
              <motion.div
                key={type.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setFormData((p) => ({ ...p, eventType: type.key }));
                  nextStep();
                }}
                className={`rounded-2xl p-6 border-2 text-center cursor-pointer transition ${
                  formData.eventType === type.key ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-violet-600 mb-4">{type.icon}</div>
                <h3 className="text-base font-medium text-slate-800">{type.name}</h3>
              </motion.div>
            ))}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <input
              type="text"
              name="hosts"
              value={formData.hosts}
              onChange={handleInputChange}
              placeholder="Nombres anfitriones"
              className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
            />
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleInputChange}
              placeholder="Nombre del evento"
              className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
            />
          </div>
        );
      case 3:
        return (
          <textarea
            name="initialMessage"
            value={formData.initialMessage}
            onChange={handleInputChange}
            placeholder="Mensaje inicial"
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 h-32 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
        );
      case 4:
        return (
          <textarea
            name="invitationMessage"
            value={formData.invitationMessage}
            onChange={handleInputChange}
            placeholder="Texto invitación"
            className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 h-40 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
        );
      case 5:
        return (
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="date"
              name="eventDate"
              value={formData.eventDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
            />
            <input
              type="time"
              name="eventTime"
              value={formData.eventTime}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
            />
          </div>
        );
      case 6:
        return <LocationForm locations={formData.locations} setFormData={setFormData} />;
      case 7:
        return (
          <div className="space-y-3">
            {formData.indications.map((ind, i) => (
              <input
                key={i}
                type="text"
                value={ind}
                onChange={(e) => handleIndicationChange(i, e)}
                placeholder="Indicación"
                className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
              />
            ))}
            <Button
              onClick={addIndication}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Añadir indicación
            </Button>
          </div>
        );
      case 8:
        return (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900"
            />
            {imagePreview && (
              <img src={imagePreview} alt="Vista previa" className="mt-4 rounded-lg max-h-60 mx-auto" />
            )}
          </div>
        );
      case 9:
        return (
          <div className="grid md:grid-cols-3 gap-6">
            {templates.map((t) => (
              <div
                key={t.id}
                onClick={() => setFormData((p) => ({ ...p, template: t.id }))}
                className={`rounded-lg overflow-hidden border-4 ${
                  formData.template === t.id ? 'border-violet-500' : 'border-transparent'
                } cursor-pointer bg-white shadow-sm`}
              >
                <img src={t.img} alt={t.name} className="w-full h-40 object-cover" />
                <p className="text-center p-2 text-slate-800">{t.name}</p>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{editingEventId ? 'Editar Invitación' : 'Crea tu Invitación'}</h1>
          <Button
            onClick={() => navigate(editingEventId ? `/host/${editingEventId}` : '/')}
            variant="ghost"
            size="icon"
            className="text-slate-700 hover:bg-slate-100"
          >
            <Home />
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex justify-center mb-8 space-x-2 md:space-x-4">
          {wizardSteps.map((s) => (
            <div
              key={s.id}
              onClick={() => updateStep(s.id)}
              title={s.title}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all duration-300 hover:scale-110 ${
                step >= s.id ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-300 text-slate-500'
              }`}
            >
              {React.cloneElement(s.icon, { className: 'w-4 h-4 md:w-5 md:h-5' })}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 border border-slate-200 bg-white min-h-[300px] shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">{wizardSteps[step - 1].title}</h2>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={prevStep}
            disabled={step === 1}
            variant="outline"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <ArrowLeft className="mr-2" /> Anterior
          </Button>

          {editingEventId ? (
            <Button
              onClick={handleSaveAndExit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              <Save className="mr-2 h-4 w-4" /> Guardar cambios
            </Button>
          ) : step < wizardSteps.length ? (
            <Button onClick={() => updateStep(step + 1)} className="bg-violet-600 hover:bg-violet-700 text-white">
              Siguiente <ArrowRight className="ml-2" />
            </Button>
          ) : (
            <Button
              onClick={finishWizard}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Finalizar y Ver Previa'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationWizard;
