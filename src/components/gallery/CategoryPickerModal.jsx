import React from 'react';

// Mantiene el mismo orden solicitado
const CATEGORIES = [
  'DESTACADO',
  'PREPARACIÓN',
  'PRIMERA VISTA',
  'CEREMONIA',
  'RETRATOS',
  'PROTOCOLO',
  'FAMILIA',
  'AMIGOS',
  'RECEPCIÓN',
  'LA FIESTA',
  'DETALLES & DECORACIÓN',
];

// Sugerencia de imágenes por categoría (coloca los archivos en /public/categories)
const CATEGORY_IMAGES = {
  'DESTACADO': '/categories/destacado.jpg',
  'PREPARACIÓN': '/categories/preparacion.jpg',
  'PRIMERA VISTA': '/categories/primeravista.jpg',
  'CEREMONIA': '/categories/ceremonia.jpg',
  'RETRATOS': '/categories/retratos.jpg',
  'PROTOCOLO': '/categories/protocolo.jpg',
  'FAMILIA': '/categories/familia.jpg',
  'AMIGOS': '/categories/amigos.jpg',
  'RECEPCIÓN': '/categories/recepcion.jpg',
  'LA FIESTA': '/categories/lafiesta.jpg',
  'DETALLES & DECORACIÓN': '/categories/detalles.jpg',
};

const CategoryPickerModal = ({ open, onClose, onPick }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-[92vw] max-w-3xl max-h-[88vh] rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 text-center">Elige una categoría</h3>
          <p className="text-xs text-slate-600 text-center mt-1">Se abrirá tu galería y las fotos que selecciones tendrán esta categoría.</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const img = CATEGORY_IMAGES[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onPick(cat)}
                  className="relative rounded-xl overflow-hidden border border-slate-200 group focus:outline-none focus:ring-2 focus:ring-slate-400"
                  aria-label={`Elegir categoría ${cat}`}
                >
                  <div
                    className="h-28 sm:h-32 w-full bg-center bg-cover"
                    style={{ backgroundImage: img ? `url('${img}')` : 'linear-gradient(135deg,#f3f4f6,#e5e7eb)' }}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/25 transition-colors" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <span className="inline-block text-white text-sm font-semibold bg-black/50 px-2 py-1 rounded">
                      {cat}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-3 border-t border-slate-200 text-center">
          <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-800 underline">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryPickerModal;
