import React from 'react';

/**
 * Cambio mínimo:
 * - Deja de usar base64 (FileReader) y usa el File original.
 * - Preview con URL.createObjectURL(file) (sin cambios visuales).
 * - Expone setImageFile para que el wizard suba el original y genere la versión web.
 */
const StepCoverImage = ({ imagePreview, setImagePreview, setImageFile }) => {
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Guardar el File original para subirlo en el wizard
    if (typeof setImageFile === 'function') setImageFile(file);

    // Preview con object URL (sin base64)
    try {
      // Revoca URL anterior si era un blob
      if (imagePreview && imagePreview.startsWith('blob:')) {
        try { URL.revokeObjectURL(imagePreview); } catch {}
      }
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } catch {
      // Fallback: si algo falla, no rompemos el flujo
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
      {imagePreview && (
        <img
          src={imagePreview}
          alt="Vista previa"
          className="mt-4 rounded-lg max-h-60 mx-auto"
        />
      )}
    </div>
  );
};

export default StepCoverImage;
