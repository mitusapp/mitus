// FILE: src/components/profile/ContactsList.jsx
import React from 'react';
import { Eye, Pencil, Trash2, ExternalLink, Phone } from 'lucide-react';
import { useCategories } from '@/features/categories/useCategories';

/**
 * Lista independiente para contactos/proveedores (PERFIL)
 * Espera filas con shape:
 *   { provider_id, created_at, planner_providers: { id, name, category_id, service_type?, contact_name, email, phone, instagram, website, location, notes } }
 */
export default function ContactsList({
  rows = [],
  loading = false,
  onView,   // handler para abrir el modal de vista
  onEdit,
  onDelete,
  labelFromServiceType = (v) => v, // fallback legacy
  className = '',
  emptyMessage = 'Aún no has agregado proveedores. Crea tu primer contacto con el botón “Nuevo proveedor”.',
}) {
  const { byId } = useCategories();
  const showEmpty = !loading && (!rows || rows.length === 0);

  const normalizePhone = (raw) => (raw || '').replace(/[^\d+]/g, '');
  const buildWhatsAppLink = (raw) => {
    const digits = (raw || '').replace(/\D/g, '');
    // Si parece un celular de CO sin indicativo (10 dígitos), antepone 57
    const withCC = digits.length === 10 ? `57${digits}` : digits;
    return withCC ? `https://api.whatsapp.com/send?phone=${withCC}` : '';
  };

  return (
    <div className={`bg-white rounded-2xl border border-[#DCD9D6] overflow-hidden ${className}`}>
      {loading ? (
        <div className="py-16 text-center text-gray-500 text-sm">Cargando…</div>
      ) : showEmpty ? (
        <div className="py-16 text-center text-gray-500 text-sm">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <colgroup>
              {/* Ajuste fino de anchos para que Teléfono tenga más espacio */}
              <col /> {/* Proveedor */}
              <col /> {/* Contacto */}
              <col style={{ width: '280px' }} /> {/* Teléfono */}
              <col /> {/* Instagram */}
              <col /> {/* Categoría */}
              <col /> {/* Ubicación */}
              <col /> {/* Acciones */}
            </colgroup>
            <thead className="bg-[#F7F6F5] text-[#2A2A2A]">
              <tr>
                <th className="px-4 py-3 font-semibold">Proveedor</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold w-[280px]">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Instagram</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
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

                const telHref = p.phone ? `tel:${normalizePhone(p.phone)}` : '';
                const waHref = p.phone ? buildWhatsAppLink(p.phone) : '';

                return (
                  <tr key={row.provider_id} className="border-t border-[#EEECE9] hover:bg-[#FAFAF9]">
                    {/* Proveedor: SOLO nombre (sin categoría ni notas) */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-[#1E1E1E]">{p.name || '—'}</div>
                    </td>

                    {/* Contacto: nombre y (si hay) email clickeable */}
                    <td className="px-4 py-3 align-top text-[#1E1E1E]">
                      <div>{p.contact_name || '—'}</div>
                      {p.email ? (
                        <div className="mt-1">
                          <a href={`mailto:${p.email}`} className="text-[#2A5BD7] hover:underline">{p.email}</a>
                        </div>
                      ) : null}
                    </td>

                    {/* Teléfono: número + botones WhatsApp y Llamar (solo íconos) */}
                    <td className="px-4 py-3 align-top text-[#1E1E1E] whitespace-nowrap">
                      {p.phone ? (
                        <div className="flex items-center gap-2">
                          <span>{p.phone}</span>
                          {waHref ? (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 text-[#1E1E1E] hover:bg-gray-50"
                              title="WhatsApp"
                              aria-label="Abrir WhatsApp"
                            >
                              <WhatsAppIcon className="w-4 h-4" />
                            </a>
                          ) : null}
                          {telHref ? (
                            <a
                              href={telHref}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 text-[#1E1E1E] hover:bg-gray-50"
                              title="Llamar"
                              aria-label="Llamar"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          ) : null}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Instagram */}
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

                    {/* Categoría (penúltima columna) */}
                    <td className="px-4 py-3 align-top">
                      {category && category !== '—' ? (
                        <div className="inline-flex items-center rounded-full bg-[#EFF6F3] text-[#356e5a] px-2 py-0.5 text-xs">
                          {category}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Ubicación */}
                    <td className="px-4 py-3 align-top text-[#1E1E1E]">{p.location || '—'}</td>

                    {/* Acciones */}
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ver */}
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

// Logo oficial de WhatsApp (SVG inline, hereda color actual)
function WhatsAppIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.149-.672.149-.198.297-.769.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.447-.521.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.074-.149-.672-1.611-.92-2.206-.242-.579-.487-.5-.672-.51-.173-.009-.372-.011-.571-.011-.198 0-.521.074-.794.372-.273.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.718 2.006-1.411.248-.694.248-1.289.173-1.411-.074-.123-.272-.198-.57-.347M12.051 18.124h-.003c-1.218 0-2.423-.32-3.488-.922l-.25-.149-2.59.679.693-2.522-.162-.259a6.924 6.924 0 0 1-1.053-3.664c.003-3.887 3.178-7.05 7.066-7.05 1.888.001 3.663.738 4.999 2.074 1.336 1.337 2.07 3.113 2.069 5.002-.003 3.887-3.178 7.05-7.066 7.05m6.066-13.116C16.958 3.59 14.554 2.67 12.047 2.67h-.006C7.038 2.67 2.957 6.742 2.955 11.744c-.001 1.6.419 3.162 1.216 4.528L2 22.314l6.15-1.613c1.333.73 2.83 1.115 4.351 1.116h.005c5.003 0 9.084-4.072 9.086-9.074.001-2.425-.943-4.706-2.652-6.415"
      />
    </svg>
  );
}
