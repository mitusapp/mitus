import React from 'react';

const StepCoverImage = ({ imagePreview, setImagePreview }) => {
  const handleImageChange = (e) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-slate-900"
      />
      {imagePreview && <img src={imagePreview} alt="Vista previa" className="mt-4 rounded-lg max-h-60 mx-auto" />}
    </div>
  );
};

export default StepCoverImage;
