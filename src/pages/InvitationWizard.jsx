/* eslint-disable react/no-unknown-property */
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Home, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// 🔹 Registro dinámico de pasos (icono + componente + título)
import { steps } from '@/pages/invitation-wizard/steps';

const initialData = {
  eventType: '',
  hosts: '',
  eventName: '',
  initialMessage: '',
  invitationMessage: '',
  eventDate: '',
  eventTime: '',
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

const InvitationWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);

  // Paso actual desde query param ?step=
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

  // Cargar modo edición (?edit=ID)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const editId = params.get('edit');
    if (editId) setEditingEventId(editId);
  }, [location.search]);

  // ⚠️ HIDRATACIÓN EN MODO EDICIÓN:
  // Si existe editingEventId, traemos el evento de Supabase y rellenamos el formulario.
  useEffect(() => {
    const loadForEdit = async () => {
      if (!editingEventId || !user) return;

      const { data, error } = await supabase
        .from('events')
        .select('title, date, event_type, cover_image_url, invitation_details')
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
        eventType: data.event_type || '',
        hosts: Array.isArray(inv.hosts) ? inv.hosts.join(' y ') : (inv.hosts || ''),
        eventName: data.title || '',
        initialMessage: inv.welcome_message || '',
        invitationMessage: inv.invitation_text || '',
        eventDate: data.date || '',
        eventTime: inv.event_time || '',
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
            : [
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
        indications:
          Array.isArray(inv.indications) && inv.indications.length ? inv.indications : [''],
        template: inv.template || 'template1',
      }));

      if (data.cover_image_url) {
        setImagePreview(data.cover_image_url); // Muestra la imagen pública ya guardada
      }
    };

    loadForEdit();
  }, [editingEventId, user]);

  // Persistencia local del formulario
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

  const updateStep = (newIndex /* 0-based */) => {
    const clamped = Math.max(0, Math.min(newIndex, steps.length - 1));
    setStepIndex(clamped);

    const params = new URLSearchParams(location.search);
    params.set('step', String(clamped + 1));
    navigate(`?${params.toString()}`, { replace: true });
  };

  const prevStep = () => updateStep(stepIndex - 1);

  // Helpers
  const shortEventId = () =>
    (crypto?.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase());

  const normalizeHosts = (val) => {
    if (Array.isArray(val)) return val.map((h) => String(h).trim()).filter(Boolean);
    return String(val || '')
      .split(/\s*(?:&|y)\s*/i)
      .map((h) => h.trim())
      .filter(Boolean);
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
      const eventId = isUpdate ? editingEventId : shortEventId();

      // Subida de imagen si es base64/Blob
      let cover_image_url =
        imagePreview && imagePreview.startsWith('https://') ? imagePreview : null;

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
        ({ error } = await supabase
          .from('events')
          .update({ id: finalId, ...eventData })
          .eq('id', finalId));
      } else {
        ({ error } = await supabase.from('events').insert({ id: finalId, ...eventData }));
      }

      if (error) throw error;

      // 🔔 Notificar a otras vistas (p.ej., ProfilePage) que el evento cambió/creó
      try {
        window.dispatchEvent(
          new CustomEvent('events:changed', {
            detail: {
              id: finalId,
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

  const handleSaveAndExit = async () => {
    const id = await saveEvent(true);
    if (id) navigate(`/host/${id}`);
  };

  const finishWizard = async () => {
    if (editingEventId) {
      const id = await saveEvent(true);
      if (id) navigate(`/host/${id}`);
    } else {
      const id = await saveEvent(false);
      if (id) {
        toast({ title: '¡Evento listo!', description: 'Te llevamos al panel del evento.' });
        navigate(`/host/${id}`);
      }
    }
  };

  // Paso activo
  const { Component: ActiveStep, title, icon: Icon } = steps[stepIndex];

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
            const ActiveIcon = s.icon;
            const isDoneOrCurrent = stepIndex >= idx;
            return (
              <div
                key={s.id}
                onClick={() => updateStep(idx)}
                title={s.title}
                className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border-2 cursor-pointer transition-all duration-300 hover:scale-110 ${
                  isDoneOrCurrent
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'bg-white border-slate-300 text-slate-500'
                }`}
              >
                <ActiveIcon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            );
          })}
        </div>

        {/* Card del paso */}
        <div className="rounded-2xl p-6 border border-slate-200 bg-white min-h-[300px] shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            {Icon && <Icon className="w-5 h-5 text-violet-600" />}
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <ActiveStep
                formData={formData}
                setFormData={setFormData}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                updateStep={(n /* 1-based */) => updateStep(n - 1)}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navegación */}
        <div className="flex justify-between mt-8">
          <Button
            onClick={prevStep}
            disabled={stepIndex === 0}
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
          ) : stepIndex < steps.length - 1 ? (
            <Button
              onClick={() => updateStep(stepIndex + 1)}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              Siguiente <ArrowRight className="ml-2" />
            </Button>
          ) : (
            <Button
              onClick={finishWizard}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Finalizar y ver evento'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationWizard;
