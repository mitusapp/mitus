// FILE: src/components/profile/ContactsHeader.jsx
import React from 'react';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Barra superior sticky para la vista de Proveedores/Contactos
 * - Título grande
 * - Buscador con icono
 * - Botón "Nuevo proveedor" con gradiente (mismo estilo que Crear Evento)
 */
export default function ContactsHeader({
  title = 'Proveedores y contactos',
  query,
  onQueryChange,
  onNew,
  placeholder = 'Buscar por nombre, categoría, contacto, email, teléfono, IG, web, ubicación…',
}) {
  return (
    <div className="sticky top-12 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-[#EDEAE7]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1E1E1E]">{title}</h1>
        <div className="flex gap-3 w-full md:w-auto">
          {/* Buscador */}
          <label className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => onQueryChange?.(e.target.value)}
              placeholder={placeholder}
              className="w-full p-2 pl-9 rounded-lg border border-gray-300 bg-white text-sm text-[#1E1E1E] focus:outline-none focus:ring-2 focus:ring-[#9E7977]"
            />
          </label>

          {/* CTA */}
          <Button onClick={onNew} className="bg-gradient-to-r from-[#8ABBD6] to-[#A9D8C5] text-white flex-shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Nuevo proveedor
          </Button>
        </div>
      </div>
    </div>
  );
}
