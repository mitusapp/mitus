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
        className="grid-masonry"
        style={{
          gap: 'var(--grid-gap, 6px)',
          gridAutoRows: 'var(--grid-auto-rows, 1px)', // debe seguir siendo 1px para el masonry; el tema puede mantener 1px
        }}
      >
        {displayItems.map((upload, index) => {
          const isVideo = upload.type === 'video';
          const mediaUrl = isVideo ? upload.file_url : upload.web_url; // SOLO web para fotos

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
                    src={mediaUrl}
                    className="w-full h-auto"
                    playsInline
                    muted
                    data-media
                    onLoadedMetadata={(e) => onImageReady(e.currentTarget)}
                    style={{
                      filter: 'var(--grid-media-filter, none)',
                      transition: 'var(--grid-media-transition, filter .25s ease)',
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <VideoIcon
                      className="w-10 h-10 text-white/90"
                      style={{ color: 'var(--grid-video-icon, rgba(255,255,255,.9))' }}
                    />
                  </div>
                </div>
              ) : (
                <img
                  src={mediaUrl}
                  alt={upload.title || 'Foto del evento'}
                  className="w-full h-auto select-none"
                  loading="lazy"
                  decoding="async"
                  data-media
                  onLoad={(e) => onImageReady(e.currentTarget)}
                  style={{
                    filter: 'var(--grid-media-filter, none)',
                    transition: 'var(--grid-media-transition, filter .25s ease)',
                  }}
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
