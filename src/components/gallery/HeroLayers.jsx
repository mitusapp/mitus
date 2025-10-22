// src/components/gallery/HeroLayers.jsx
import React, { useMemo } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Pinta 3 slots de decoración (topLeft, topRight, bottom) con animación de entrada
 * y parallax sutil en scroll. Las imágenes/posiciones vienen por CSS vars.
 *
 * Importante: NO animamos el mismo nodo que lleva el anclaje por CSS (translate de esquina),
 * sino un hijo <motion.div>. Así evitamos sobrescribir el transform del anclaje.
 *
 * Props:
 * - parallaxStrength?: número (px) de desplazamiento sutil. Default: 8.
 * - sequence?: orden para delays, ej: ["bg","decorTopLeft","decorTopRight","decorBottom","content"]
 */
export default function HeroLayers({
  parallaxStrength = 8,
  sequence = ["bg", "decorTopLeft", "decorTopRight", "decorBottom", "content"],
}) {
  const prefersReduced = useReducedMotion();
  const { scrollY } = useScroll();
  const yParallax = useTransform(scrollY, [0, 200], [0, -parallaxStrength]);

  // Mapa para delays según la secuencia
  const order = useMemo(() => {
    const map = new Map();
    sequence.forEach((key, i) => map.set(key, i));
    return map;
  }, [sequence]);

  /**
   * Wrapper estático (con clases .decor-slot .decor-xxx) conserva el anclaje por CSS.
   * El hijo <motion.div> (".decor-inner") maneja la animación/offset sin tocar el transform del wrapper.
   */
  const Decor = ({ slotKey, className }) => (
    <div className={`decor-slot ${className}`} aria-hidden>
      <motion.div
        className="decor-inner"
        style={!prefersReduced ? { y: yParallax } : undefined}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          delay: ((order.get(slotKey) ?? 0) * 0.08),
          duration: 0.5,
          ease: "easeOut",
        }}
      />
    </div>
  );

  return (
    <>
      <Decor slotKey="decorTopLeft"  className="decor-topLeft" />
      <Decor slotKey="decorTopRight" className="decor-topRight" />
      <Decor slotKey="decorBottom"   className="decor-bottom" />
    </>
  );
}
