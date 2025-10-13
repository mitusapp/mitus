// src/components/planner/ProvidersList.jsx
import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCategories } from '@/features/categories/useCategories';

function statusChip(status, labelFromEventStatus) {
  const map = {
    tentative: 'bg-yellow-500/20 text-yellow-300 border-yellow-600/30',
    contacted: 'bg-blue-500/20 text-blue-300 border-blue-600/30',
    quoted: 'bg-cyan-500/20 text-cyan-300 border-cyan-600/30',
    booked: 'bg-emerald-500/20 text-emerald-300 border-emerald-600/30',
    confirmed: 'bg-green-500/20 text-green-300 border-green-600/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-600/30',
  };
  const label = typeof labelFromEventStatus === 'function' ? labelFromEventStatus(status) : status;
  return (
    <span className={`px-2 py-1 rounded text-xs border ${map[status] || 'bg-white/10 text-gray-200 border-white/20'}`}>
      {label}
    </span>
  );
}

// Opciones por defecto para el picker de estado (compatibles con tu app)
const DEFAULT_EVENT_STATUS = [
  { value: 'tentative', label: 'Tentativo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'quoted', label: 'Cotizado' },
  { value: 'booked', label: 'Reservado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'cancelled', label: 'Cancelado' },
];

/**
 * ProvidersList
 * Tabla de proveedores vinculados al evento.
 * Props:
 *  - loading: boolean
 *  - rows: Array<{ provider_id, status, created_at, planner_providers: {...} }>
 *  - onView: (row) => void                            // NUEVO: abre ProviderViewModal
 *  - onEdit: (row) => void                            // editar proveedor (usa ContactsFormModal en el padre)
 *  - onUnlink: (provider_id: string|number) => void
 *  - onStatusChange: (provider_id, newStatus) => void // NUEVO: inline update del estado del vínculo
 *  - labelFromServiceType: (value) => string
 *  - labelFromEventStatus: (value) => string
 *  - statusOptions?: Array<{value,label}>             // opcional, por defecto DEFAULT_EVENT_STATUS
 */
export default function ProvidersList({
  loading,
  rows = [],
  onView,
  onEdit,
  onUnlink,
  onStatusChange,
  labelFromServiceType,
  labelFromEventStatus,
  statusOptions = DEFAULT_EVENT_STATUS,
}) {
  const { byId } = useCategories();

  return (
    <div className="rounded border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="text-left p-3 font-medium">Nombre</th>
            <th className="text-left p-3 font-medium">Categoría</th>
            <th className="text-left p-3 font-medium">Contacto</th>
            <th className="text-left p-3 font-medium">Email / Teléfono</th>
            <th className="text-left p-3 font-medium">Ubicación</th>
            <th className="text-left p-3 font-medium">Estado</th>
            <th className="text-right p-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-400">Cargando…</td>
            </tr>
          )}

          {!loading && rows.map((r) => {
            const p = r.planner_providers || {};

            // === Categoría desde app_categories (Padre › Hija). Fallback: service_type / category legacy ===
            let categoryLabel = '—';
            if (p.category_id && byId[p.category_id]) {
              const cat = byId[p.category_id];
              const parent = cat?.parent_id ? byId[cat.parent_id] : null;
              categoryLabel = parent ? `${parent.name} › ${cat.name}` : cat.name;
            } else {
              categoryLabel =
                (typeof labelFromServiceType === 'function' && labelFromServiceType(p.service_type)) ||
                p.category ||
                '—';
            }

            const currentStatus = r.status || 'tentative';

            return (
              <tr key={r.provider_id} className="border-b border-white/10 hover:bg-white/5">
                {/* Nombre (sin notas) */}
                <td className="p-3">
                  <div className="font-medium text-white">{p.name || '—'}</div>
                </td>

                {/* Categoría */}
                <td className="p-3 text-gray-200">{categoryLabel}</td>

                {/* Contacto */}
                <td className="p-3 text-gray-200">{p.contact_name || '—'}</td>

                {/* Email / Teléfono */}
                <td className="p-3 text-gray-200">
                  <div>{p.email || '—'}</div>
                  <div className="text-xs text-gray-400">{p.phone || ''}</div>
                </td>

                {/* Ubicación */}
                <td className="p-3 text-gray-200">{p.location || '—'}</td>

                {/* Estado (editable si hay onStatusChange; si no, chip como antes) */}
                <td className="p-3">
                  {typeof onStatusChange === 'function' ? (
                    <select
                      className="px-2 py-1 rounded border border-white/20 bg-white text-gray-900"
                      value={currentStatus}
                      onChange={(e) => onStatusChange(r.provider_id, e.target.value)}
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    statusChip(currentStatus, labelFromEventStatus)
                  )}
                </td>

                {/* Acciones: Ver (izq) · Editar · Desvincular */}
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onView?.(r)} title="Ver">
                      <Eye className="w-4 h-4 text-gray-300" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit?.(r)} title="Editar">
                      <Edit className="w-4 h-4 text-gray-300" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onUnlink?.(r.provider_id)} title="Desvincular">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}

          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-gray-400">No hay proveedores</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
