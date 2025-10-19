// src/pages/invitation-wizard/steps/StepHostsEvent.jsx
// MOD: Eliminar campo "Nombre del evento" y autogenerarlo según el tipo de evento seleccionado.
// - Se mantiene únicamente el campo de Anfitriones.
// - El título se guarda en formData.eventName automáticamente a partir de formData.eventType.
// - Compatibilidad: InvitationWizard sigue usando formData.eventName para eventData.title.

import React, { useEffect } from 'react';

const AUTO_TITLES = {
  boda: 'Nuestra Boda',
  quince: 'Mis Quince Años',
  cumpleanos: 'Mi Cumpleaños',
  aniversario: 'Nuestro Aniversario',
  babyshower: 'Mi Baby Shower',
  corporativo: 'Evento corporativo',
  otro: 'Mi Evento',
};

export default function StepHostsEvent({ formData, setFormData }) {
  // Autogenerar el nombre del evento cuando cambia el tipo
  useEffect(() => {
    const key = (formData?.eventType || '').toLowerCase();
    const computed = AUTO_TITLES[key] || AUTO_TITLES.otro;
    setFormData((prev) => (prev?.eventName === computed ? prev : { ...prev, eventName: computed }));
  }, [formData?.eventType, setFormData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Anfitrión/es</label>
        <input
          type="text"
          name="hosts"
          value={formData.hosts || ''}
          onChange={handleChange}
          placeholder="Nombres anfitriones (ej.: Ana y Juan)"
          className="w-full px-3 py-2 bg-white rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          autoComplete="name"
        />
        <p className="text-xs text-muted-foreground mt-1">Puedes separar varios nombres con "y" o "&". Ej.: "Ana y Juan".</p>
      </div>

      {/* Campo oculto (no se muestra) que mantiene compatibilidad del título */}
      <input type="hidden" name="eventName" value={formData.eventName || ''} readOnly />

      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        <ul className="list-disc pl-5 space-y-1">
          <li>El nombre del evento se genera automáticamente según la categoría seleccionada.</li>
          <li>Valores posibles: {Object.values(AUTO_TITLES).join(', ')}.</li>
        </ul>
      </div>
    </div>
  );
}
