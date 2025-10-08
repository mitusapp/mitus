import React from 'react';

const StepInitialMessage = ({ formData, setFormData }) => {
  return (
    <textarea
      name="initialMessage"
      value={formData.initialMessage}
      onChange={(e) => setFormData((p) => ({ ...p, initialMessage: e.target.value }))}
      placeholder="Mensaje inicial"
      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 h-32 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
    />
  );
};

export default StepInitialMessage;
