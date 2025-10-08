import React from 'react';

const StepDateTime = ({ formData, setFormData }) => {
  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <input
        type="date"
        name="eventDate"
        value={formData.eventDate}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
      />
      <input
        type="time"
        name="eventTime"
        value={formData.eventTime}
        onChange={handleChange}
        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
      />
    </div>
  );
};

export default StepDateTime;
