import React from 'react';
import { Button } from '@/components/ui/button';

const StepIndications = ({ formData, setFormData }) => {
  const handleIndicationChange = (i, value) => {
    setFormData((prev) => ({
      ...prev,
      indications: prev.indications.map((ind, idx) => (idx === i ? value : ind)),
    }));
  };

  const addIndication = () =>
    setFormData((prev) => ({ ...prev, indications: [...prev.indications, ''] }));

  return (
    <div className="space-y-3">
      {formData.indications.map((ind, i) => (
        <input
          key={i}
          type="text"
          value={ind}
          onChange={(e) => handleIndicationChange(i, e.target.value)}
          placeholder="Indicación"
          className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
        />
      ))}
      <Button onClick={addIndication} variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
        Añadir indicación
      </Button>
    </div>
  );
};

export default StepIndications;
