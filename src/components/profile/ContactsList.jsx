// FILE: src/components/profile/ContactsList.jsx
import React from 'react';
import { Eye, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { useCategories } from '@/features/categories/useCategories';

/**
 * Lista independiente para contactos/proveedores (PERFIL)
 * Espera filas con shape:
 *   { provider_id, created_at, planner_providers: { id, name, category_id, service_type?, contact_name, email, phone, instagram, website, location, notes } }
 */
export default function ContactsList({
  rows = [],
  loading = false,
  onView,   // NEW: handler para abrir el modal de vista
  onEdit,
  onDelete,
  labelFromServiceType = (v) => v, // fallback legacy
  className = '',
  emptyMessage = 'Aún no has agregado proveedores. Crea tu primer contacto con el botón “Nuevo proveedor”.',
}) {
  const { byId } = useCategories();
  const showEmpty = !loading && (!rows || rows.length === 0);

  return (
    <div className={`bg-white rounded-2xl border border-[#DCD9D6] overflow-hidden ${className}`}>
      {loading ? (
        <div className="py-16 text-center text-gray-500 text-sm">Cargando…</div>
      ) : showEmpty ? (
        <div className="py-16 text-center text-gray-500 text-sm">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F7F6F5] text-[#2A2A2A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Proveedor</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Instagram</th>
                <th className="px-4 py-3 font-semibold">Web</th>
                <th className="px-4 py-3 font-semibold">Ubicación</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const p = row.planner_providers || {};

                // Categoría desde app_categories (Padre › Hija). Fallback: service_type legacy
                let category = '—';
                if (p.category_id && byId[p.category_id]) {
                  const cat = byId[p.category_id];
                  const parent = cat?.parent_id ? byId[cat.parent_id] : null;
                  category = parent ? `${parent.name} › ${cat.name}` : cat.name;
                } else {
                  category = labelFromServiceType(p.service_type);
                }

                const ig = (p.instagram || '').replace(/^@+/, '');
                const website = p.website && /^https?:\/\//i.test(p.website)
                  ? p.website
                  : (p.website ? `https://${p.website}` : '');

                return (
                  <tr key={row.provider_id} className="border-t border-[#EEECE9] hover:bg-[#FAFAF9]">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-[#1E1E1E]">{p.name || '—'}</div>
                      <div className="mt-1 inline-flex items-center rounded-full bg-[#EFF6F3] text-[#356e5a] px-2 py-0.5 text-xs">
                        {category || '—'}
                      </div>
                      {p.notes ? (
                        <div className="mt-1 text-xs text-gray-500 line-clamp-2">{p.notes}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-[#1E1E1E]">{p.contact_name || '—'}</td>
                    <td className="px-4 py-3 align-top text-[#1E1E1E]">{p.phone || '—'}</td>
                    <td className="px-4 py-3 align-top">
                      {p.email ? (
                        <a href={`mailto:${p.email}`} className="text-[#2A5BD7] hover:underline">{p.email}</a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {ig ? (
                        <a
                          href={`https://instagram.com/${ig}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2A5BD7] hover:underline"
                          title={`Abrir @${ig} en Instagram`}
                        >
                          @{ig} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {website ? (
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2A5BD7] hover:underline"
                          title="Abrir sitio web"
                        >
                          {p.website} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 align-top text-[#1E1E1E]">{p.location || '—'}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {/* NEW: Ver */}
                        <button
                          type="button"
                          onClick={() => onView?.(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 text-[#1E1E1E] hover:bg-gray-50"
                          aria-label="Ver proveedor"
                          title="Ver proveedor"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => onEdit?.(row)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 text-[#1E1E1E] hover:bg-gray-50"
                          aria-label="Editar proveedor"
                          title="Editar proveedor"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => onDelete?.(row.provider_id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 text-red-700 hover:bg-red-50"
                          aria-label="Eliminar proveedor"
                          title="Eliminar proveedor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
