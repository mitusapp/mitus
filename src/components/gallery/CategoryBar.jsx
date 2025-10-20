// src/components/gallery/CategoryBar.jsx
import React from 'react';

const CategoryBar = ({ show, stickyShadow, items, active, onChange, isVisible = true }) => {
  if (!show) return null;

  const getVar = (name, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(name)?.trim() || fallback;

  return (
    <section
      className={`sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-black/10 ${stickyShadow ? 'shadow-sm' : ''} transition-transform duration-0 ease-out transform-gpu will-change-transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}
      style={{
        willChange: 'transform, opacity',
         transitionDuration: '800ms',
        background: 'var(--catbar-bg, rgba(255,255,255,.90))',
        backdropFilter: 'var(--catbar-blur, blur(8px))',
        WebkitBackdropFilter: 'var(--catbar-blur, blur(8px))', // compat Safari/iOS
        borderColor: 'var(--catbar-border, rgba(0,0,0,.10))',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="w-full overflow-x-auto">
          <ul className="flex gap-6 text-sm md:text-base font-lato">
            {items.map((cat) => {
              const isActive = cat === active;
              return (
                <li key={cat}>
                  <button
                    onClick={() => onChange(cat)}
                    className={`relative py-3 inline-block ${isActive ? 'text-black' : 'text-black/60 hover:text-black'}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Filtrar por ${cat}`}
                    style={{
                      /* Preferimos los tokens nuevos --catbar-*, con fallback a los antiguos --cat-* */
                      color: isActive
                        ? 'var(--catbar-item-active, var(--cat-active, #000))'
                        : 'var(--catbar-item, var(--cat-inactive, rgba(0,0,0,.60)))',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        const hover =
                          getVar('--catbar-item-hover',
                            getVar('--catbar-item',
                              getVar('--cat-active', '#000')
                            )
                          );
                        e.currentTarget.style.color = hover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        const inactive =
                          getVar('--catbar-item',
                            getVar('--cat-inactive', 'rgba(0,0,0,.60)')
                          );
                        e.currentTarget.style.color = inactive;
                      }
                    }}
                  >
                    {cat}
                    <span
                      className={`absolute left-0 right-0 bottom-0 h-[2px] ${isActive ? 'bg-black' : 'bg-transparent'}`}
                      style={{
                        background: isActive
                          ? 'var(--catbar-underline-active, var(--cat-active-underline, #000))'
                          : 'var(--catbar-underline, transparent)',
                        height: 'var(--catbar-underline-height, 2px)',
                      }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default CategoryBar;
