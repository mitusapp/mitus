// src/components/gallery/ImageGrid.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

const ImageGrid = ({ displayItems, onItemClick, onImageReady, gridWrapperRef }) => {
  return (
    <section
      className="w-full px-2 sm:px-3 lg:px-4 py-6 lg:py-10"
      ref={gridWrapperRef}
      style={{
        background: 'var(--grid-bg, transparent)',
        // Permite ajustar padding desde temas (no altera lo actual)
        paddingTop: 'var(--grid-pt, var(--grid-py, unset))',
        paddingBottom: 'var(--grid-pb, var(--grid-py, unset))',
        paddingLeft: 'var(--grid-pl, var(--grid-px, unset))',
        paddingRight: 'var(--grid-pr, var(--grid-px, unset))',
      }}
    >
      <div
        className="grid-masonry no-save"
        onContextMenu={(e) => e.preventDefault()}
        style={{
          gap: 'var(--grid-gap, 6px)',
          gridAutoRows: 'var(--grid-auto-rows, 1px)',
        }}
      >

        {displayItems.map((upload, index) => {
          const isVideo = upload.type === 'video';

          // Para el GRID: imágenes → THUMB; videos → archivo pero solo metadata
          const imgUrl = upload.thumb_url || upload.web_url || upload.file_url || '';
          const w = upload.thumb_width || upload.web_width || 1;
          const h = upload.thumb_height || upload.web_height || 1;


          return (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
              className="grid-item cursor-pointer relative"
              onClick={() => onItemClick(index)}
              title={upload.title || ''}
              style={{
                borderRadius: 'var(--grid-item-radius, 0px)',
                boxShadow: 'var(--grid-item-shadow, none)',
                outline: 'var(--grid-item-outline, none)',
                overflow: 'hidden',
              }}
            >
              {isVideo ? (
                <div
                  className="relative bg-black"
                  style={{ background: 'var(--grid-video-bg, #000)' }}
                >
                  <video
                    src={upload.file_url}
                    className="w-full h-auto"
                    playsInline
                    muted
                    preload="metadata"
                    poster={upload.thumb_url || ''}
                    data-media
                    onLoadedMetadata={(e) => onImageReady(e.currentTarget)}
                    style={{
                      filter: 'var(--grid-media-filter, none)',
                      transition: 'var(--grid-media-transition, filter .25s ease)',
                    }}

                    // 👇 Añadir estos tres:
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                  />


                </div>
              ) : (
                <img
                  src={imgUrl}
                  alt={upload.title || 'Foto del evento'}
                  className="w-full h-auto select-none"
                  loading="lazy"
                  decoding="async"
                  draggable="false"
                  width={w}
                  height={h}
                  data-media
                  data-w={w}
                  data-h={h}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  onLoad={(e) => onImageReady(e.currentTarget)}
                  style={{
                    filter: 'var(--grid-media-filter, none)',
                    transition: 'var(--grid-media-transition, filter .25s ease)',
                    background: 'var(--grid-thumb-bg, #f3f4f6)'
                  }}

                  // 👇 Añadir estos dos:
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                />

              )}
            </motion.div>
          );
        })}
      </div>

      {displayItems.length === 0 && (
        <div
          className="text-center py-20"
          style={{ color: 'var(--grid-empty-fg, inherit)' }}
        >
          <ImageIcon
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            style={{ color: 'var(--grid-empty-icon, #9ca3af)' }}
          />
          <h3
            className="text-2xl font-semibold"
            style={{ color: 'var(--grid-empty-title, inherit)' }}
          >
            Galería vacía
          </h3>
          <p
            className="text-gray-600 mt-2"
            style={{ color: 'var(--grid-empty-subtitle, #4b5563)' }}
          >
            No hay fotos o videos para mostrar.
          </p>
        </div>
      )}
    </section>
  );
};

export default ImageGrid;
