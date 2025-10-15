import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Check } from 'lucide-react';

/**
 * Lista de archivos seleccionados en formato masonry.
 * - Muestra el título "Archivos seleccionados"
 * - Controles: contador, "Eliminar selección" y "Seleccionar/Deseleccionar todo"
 * - Borde grueso por categoría para elementos con categoría asignada
 */
const SelectedFilesList = ({
  files,
  selectedCount,
  onToggleItem,       // (index) => void
  onRemoveItem,       // (index) => void
  onRemoveSelected,   // () => void
  onToggleSelectAll,  // () => void
  categoryUI,         // CATEGORY_UI map
}) => {
  return (
    <div className="space-y-3">
      <h3 className="text-slate-900 font-semibold">Archivos seleccionados</h3>

      {/* Controles de selección: contador + eliminar selección + (de)seleccionar todo */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          {selectedCount > 0 ? (
            <span>
              <span className="font-medium">{selectedCount}</span> seleccionado{selectedCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span>Selecciona archivos y luego elige una categoría</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRemoveSelected}
            className="h-8"
            disabled={selectedCount === 0}
            title="Eliminar selección"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar selección
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleSelectAll} className="h-8">
            {selectedCount > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </Button>
        </div>
      </div>

      {/* Masonry responsive */}
      <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: '1rem' }}>
        {files.map((item, index) => {
          const isSelected = item.selected;
          const hasCategory = !!item.category;

          const base = 'relative mb-4 border rounded-none overflow-hidden transition-shadow cursor-pointer inline-block w-full';
          let cardClasses = 'bg-slate-50 border-slate-200 hover:shadow-sm';

          if (isSelected) {
            // Seleccionado: mantener ring notorio
            cardClasses = 'bg-zinc-50 border-zinc-400 shadow ring-4 ring-slate-900/70';
          } else if (hasCategory) {
            // Con categoría: borde grueso (mismo tamaño perceptual que el ring-4) y color de la categoría
            const ui = categoryUI[item.category] || categoryUI['RECEPCIÓN'] || {};
            // ui.border trae p.ej. "border-blue-200" -> lo usamos con "border-4"
            cardClasses = `${ui.bg || ''} ${ui.border || 'border-slate-200'} hover:shadow border-4`;
          }

          return (
            <div
              key={`${item.file.name}-${index}`}
              className={`${base} ${cardClasses}`}
              style={{ breakInside: 'avoid' }}
              onClick={() => onToggleItem(index)}
            >
              {/* Media */}
              <div className="w-full">
                {item.type === 'photo' ? (
                  <img src={item.previewUrl} alt="" className="w-full h-auto block" loading="lazy" />
                ) : (
                  <video src={item.previewUrl} className="w-full h-auto block" muted controls={false} playsInline preload="metadata" />
                )}
              </div>

              {/* Check overlay cuando está seleccionado */}
              {isSelected && (
                <div className="absolute top-2 left-2 bg-black/60 text-white rounded-full p-1">
                  <Check className="w-4 h-4" />
                </div>
              )}

              {/* Overlay inferior con categoría + eliminar */}
              <div className="absolute inset-x-0 bottom-0">
                <div className="bg-black/45 text-white px-3 py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{hasCategory ? item.category : 'Sin categoría'}</p>
                  </div>
                  <Button
                    onClick={(e) => { e.stopPropagation(); onRemoveItem(index); }}
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/10"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SelectedFilesList;
