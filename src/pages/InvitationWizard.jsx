/* eslint-disable react/no-unknown-property */
// src/pages/InvitationWizard.jsx (ACTUALIZADO)
// Cambios clave:
// - Mantiene el flujo de pasos pero compatible con steps que exporten { Component } o { component }.
// - Añade eventCountry (CO), eventCity (""), eventCurrency (COP) al estado y a Supabase.
// - Corrige manejo de fecha/hora como cadenas (sin new Date('YYYY-MM-DD')).
// - Carga en modo edición también event_country, event_city, event_currency.
// - Persiste formData en localStorage y la portada en sessionStorage.

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Registro de pasos
import { steps } from '@/pages/invitation-wizard/steps';
export { steps as wizardSteps } from '@/pages/invitation-wizard/steps';

// ---------------------------- Utilidades ---------------------------------
const shortEventId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

const normalizeHosts = (val) => {
  if (Array.isArray(val)) return val.map((h) => String(h).trim()).filter(Boolean);
  return String(val || '')
    .split(/\s*(?:&|y)\s*/i)
    .map((h) => h.trim())
    .filter(Boolean);
};

// ---------------------------- Componente ----------------------------------
const initialData = {
  eventType: '',
  hosts: '',
  eventName: '',
  initialMessage: '',
  invitationMessage: '',
  eventDate: '',      // 'YYYY-MM-DD'
  eventTime: '',      // 'HH:mm'
  // NUEVO: país/ciudad/moneda del evento
  eventCountry: 'CO', // ISO-2, default Colombia
  eventCity: '',
  eventCurrency: 'COP', // ISO-4217, default COP
  // Campos heredados (algunos pasos fueron ocultados en el wizard)
  locations: [
    {
      title: 'Ceremonia',
      time: '',
      address: '',
      city: '',
      state: '',
      country: '',
      lat: null,
      lng: null,
      placeId: undefined,
    },
  ],
  indications: [''],
  template: 'template1',
};

function InvitationWizard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // id de edición (si viene en query ?edit=ID)
  const [editingEventId, setEditingEventId] = useState(null);

  // Paso actual (permite ?step=1..n)
  const [stepIndex, setStepIndex] = useState(() => {
    const params = new URLSearchParams(location.search);
    const stepParam = parseInt(params.get('step'), 10);
    const idx = stepParam ? stepParam - 1 : 0;
    return idx >= 0 && idx < steps.length ? idx : 0;
  });

  // Estado del formulario (persistido en localStorage)
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem('wizardFormData');
      const parsed = saved ? JSON.parse(saved) : initialData;
      // Defaults seguros para las nuevas propiedades
      parsed.eventCountry = parsed.eventCountry || 'CO';
      parsed.eventCity = parsed.eventCity || '';
      parsed.eventCurrency = parsed.eventCurrency || 'COP';
      if (parsed.locations) {
        parsed.locations = parsed.locations.map((loc) => ({
          title: loc.title || '',
          time: loc.time || '',
          address: loc.address || '',
          city: loc.city || '',
          state: loc.state || '',
          country: loc.country || '',
          lat: loc.lat ?? null,
          lng: loc.lng ?? null,
          placeId: loc.placeId,
        }));
      }
      return parsed;
    } catch {
      return initialData;
    }
  });

  // Imagen de portada (persistida en sessionStorage)
  const [imagePreview, setImagePreview] = useState(() => {
    try {
      return sessionStorage.getItem('wizardImagePreview') || '';
    } catch {
      return '';
    }
  });

  // Extra: estado de guardado
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detectar modo edición
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) setEditingEventId(editId);
  }, [location.search]);

  // Cargar datos de Supabase en modo edición
  useEffect(() => {
    const loadForEdit = async () => {
      if (!editingEventId || !user) return;

      const { data, error } = await supabase
        .from('events')
        .select('title, date, event_type, cover_image_url, event_country, event_city, event_currency, invitation_details')
        .eq('id', editingEventId)
        .single();

      if (error) {
        console.error(error);
        toast({ title: 'No se pudo cargar el evento', variant: 'destructive' });
        return;
      }

      const inv = data.invitation_details || {};

      setFormData((prev) => ({
        ...prev,
        eventCountry: data.event_country || 'CO',
        eventCity: data.event_city || '',
        eventCurrency: data.event_currency || 'COP',
        eventType: data.event_type || '',
        hosts: Array.isArray(inv.hosts) ? inv.hosts.join(' y ') : (inv.hosts || ''),
        eventName: data.title || '',
        initialMessage: inv.welcome_message || '',
        invitationMessage: inv.invitation_text || '',
        eventDate: data.date || '',           // fecha sin UTC
        eventTime: inv.event_time || '',      // hora local del evento
        locations:
          Array.isArray(inv.locations) && inv.locations.length > 0
            ? inv.locations.map((l) => ({
                title: l.title || '',
                time: l.time || '',
                address: l.address || '',
                city: l.city || '',
                state: l.state || '',
                country: l.country || '',
                lat: Number.isFinite(l.lat) ? l.lat : null,
                lng: Number.isFinite(l.lng) ? l.lng : null,
                placeId: l.placeId,
              }))
            : prev.locations,
        indications: Array.isArray(inv.indications) ? inv.indications : prev.indications,
        template: inv.template || prev.template,
      }));

      if (data.cover_image_url) setImagePreview(data.cover_image_url);
    };

    loadForEdit();
  }, [editingEventId, user]);

  // Persistencia local
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
    }
  }, [imagePreview]);

  // Navegación de pasos
  const updateStep = (idx) => {
    if (idx < 0 || idx >= steps.length) return;
    setStepIndex(idx);
  };

  const nextStep = () => updateStep(stepIndex + 1);
  const prevStep = () => updateStep(stepIndex - 1);

  // Guardado en Supabase
  const saveEvent = async (isUpdate) => {
    if (!user) {
      toast({ title: 'Error de autenticación', description: 'Debes iniciar sesión para guardar.', variant: 'destructive' });
      return null;
    }
    setIsSubmitting(true);

    try {
      const eventId = isUpdate ? editingEventId : shortEventId();

      // Subida de imagen si es base64/Blob
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

        const { data: urlData } = supabase.storage.from('event-covers').getPublicUrl(filePath);
        cover_image_url = urlData.publicUrl;
      }

      // Ensamblar payload
      const eventData = {
        title: formData.eventName,
        date: formData.eventDate,                  // 'YYYY-MM-DD' sin UTC
        event_type: formData.eventType,
        event_country: formData.eventCountry,      // NUEVO
        event_city: formData.eventCity,            // NUEVO
        event_currency: formData.eventCurrency,    // NUEVO
        cover_image_url,
        user_id: user.id,
        invitation_details: {
          hosts: normalizeHosts(formData.hosts),
          welcome_message: formData.initialMessage,
          invitation_text: formData.invitationMessage,
          event_time: formData.eventTime,          // 'HH:mm' local
          locations: formData.locations,
          indications: formData.indications,
          template: formData.template,
          countdown: true,
        },
      };

      let error;
      if (isUpdate) {
        ({ error } = await supabase.from('events').update(eventData).eq('id', eventId));
      } else {
        ({ error } = await supabase.from('events').insert({ id: eventId, ...eventData }));
      }
      if (error) throw error;

      // Notificar a otras vistas que la lista cambió
      try {
        window.dispatchEvent(
          new CustomEvent('events:changed', {
            detail: {
              id: eventId,
              title: eventData.title,
              date: eventData.date,
              event_type: eventData.event_type,
              cover_image_url: cover_image_url || null,
              hosts: eventData.invitation_details?.hosts || [],
              kind: isUpdate ? 'update' : 'insert',
            },
          })
        );
      } catch {}

      // Limpiar cache local tras crear
      if (!isUpdate) {
        try { localStorage.removeItem('wizardFormData'); } catch {}
        try { sessionStorage.removeItem('wizardImagePreview'); } catch {}
      }

      return eventId;
    } catch (err) {
      console.error('Error guardando evento:', err);
      toast({ title: 'No se pudo guardar', description: err.message || 'Ocurrió un problema.', variant: 'destructive' });
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishWizard = async () => {
    const isUpdate = Boolean(editingEventId);
    const id = await saveEvent(isUpdate);
    if (id) navigate(`/host/${id}`);
  };

  // Render
  const step = steps[stepIndex];
  const ActiveStep = step.Component || step.component; // compat
  const Icon = step.icon || null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {editingEventId ? 'Editar Invitación' : 'Crea tu Invitación'}
          </h1>
          <Button
            onClick={() => navigate(editingEventId ? `/host/${editingEventId}` : '/profile')}
            variant="ghost"
            size="icon"
            className="text-slate-700 hover:bg-slate-100"
            aria-label="Ir al panel"
          >
            <Home />
          </Button>
        </div>

        {/* Stepper */}
        <div className="flex justify-center mb-8 space-x-2 md:space-x-4">
          {steps.map((s, idx) => {
            const SIcon = s.icon || Icon;
            const isDoneOrCurrent = stepIndex >= idx;
            return (
              <div
                key={s.id}
                onClick={() => updateStep(idx)}
                title={s.title}
                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border text-sm md:text-base cursor-pointer transition-all duration-300 hover:scale-110 ${
                  isDoneOrCurrent ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-300 text-slate-500'
                }`}
              >
                {SIcon ? <SIcon className="w-4 h-4 md:w-5 md:h-5" /> : idx + 1}
              </div>
            );
          })}
        </div>

        {/* Contenido del paso */}
        <div className="bg-white rounded-2xl shadow p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {ActiveStep ? (
                <ActiveStep formData={formData} setFormData={setFormData} imagePreview={imagePreview} setImagePreview={setImagePreview} />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {/* Navegación */}
          <div className="mt-6 flex items-center justify-between">
            <Button onClick={prevStep} variant="outline" disabled={stepIndex === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Anterior
            </Button>

            {stepIndex < steps.length - 1 ? (
              <Button onClick={nextStep} className="bg-violet-600 hover:bg-violet-700 text-white">
                Siguiente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={finishWizard} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Finalizar y ver evento'} <Save className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvitationWizard;
