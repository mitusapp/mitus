import React from 'react';

const StepInvitationMessage = ({ formData, setFormData }) => {
  return (
    <textarea
      name="invitationMessage"
      value={formData.invitationMessage}
      onChange={(e) => setFormData((p) => ({ ...p, invitationMessage: e.target.value }))}
      placeholder="Texto invitación"
      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900 h-40 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
    />
  );
};

export default StepInvitationMessage;
