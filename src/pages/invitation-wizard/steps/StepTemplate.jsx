import React from 'react';

const templates = [
  { id: 'template1', name: 'Clásico Elegante', img: 'https://images.unsplash.com/photo-1532703108232-56de2c3b3d93?q=80&w=800' },
  { id: 'template2', name: 'Moderno Minimalista', img: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=800' },
  { id: 'template3', name: 'Rústico Floral', img: 'https://images.unsplash.com/photo-1520853535936-c935b892a296?q=80&w=800' },
];

const StepTemplate = ({ formData, setFormData }) => {
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
};

export default StepTemplate;
