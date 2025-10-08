import React from 'react';

const StepHostsEvent = ({ formData, setFormData }) => {
  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="space-y-4">
      <input
        type="text"
        name="hosts"
        value={formData.hosts}
        onChange={handleChange}
        placeholder="Nombres anfitriones"
        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
      />
      <input
        type="text"
        name="eventName"
        value={formData.eventName}
        onChange={handleChange}
        placeholder="Nombre del evento"
        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
      />
    </div>
  );
};

export default StepHostsEvent;
