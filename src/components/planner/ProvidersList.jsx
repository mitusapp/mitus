// src/components/planner/ProvidersList.jsx
import React from 'react';
import { ExternalLink, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

/**
 * ProvidersList
 * Tabla de proveedores vinculados al evento.
 * Props:
 *  - loading: boolean
 *  - rows: Array<{ provider_id, status, created_at, planner_providers: {...} }>
 *  - onEdit: (row) => void
 *  - onUnlink: (provider_id: string|number) => void
 *  - labelFromServiceType: (value) => string
 *  - labelFromEventStatus: (value) => string
 */
export default function ProvidersList({
  loading,
  rows = [],
  onEdit,
  onUnlink,
  labelFromServiceType,
  labelFromEventStatus,
}) {
  return (
    <div className="rounded border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-gray-300">
          <tr>
            <th className="text-left p-3 font-medium">Nombre / Notas</th>
            <th className="text-left p-3 font-medium">Categoría</th>
            <th className="text-left p-3 font-medium">Contacto</th>
            <th className="text-left p-3 font-medium">Email / Teléfono</th>
            <th className="text-left p-3 font-medium">Redes / Web</th>
            <th className="text-left p-3 font-medium">Ubicación</th>
            <th className="text-left p-3 font-medium">Estado</th>
            <th className="text-right p-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={8} className="p-6 text-center text-gray-400">Cargando…</td>
            </tr>
          )}

          {!loading && rows.map((r) => {
            const p = r.planner_providers || {};
            const categoryLabel = (typeof labelFromServiceType === 'function' && labelFromServiceType(p.service_type)) || p.category || '—';
            return (
              <tr key={r.provider_id} className="border-b border-white/10 hover:bg-white/5">
                <td className="p-3">
                  <div className="font-medium text-white">{p.name || '—'}</div>
                  {p.notes && <div className="text-xs text-gray-400 line-clamp-1">{p.notes}</div>}
                </td>
                <td className="p-3 text-gray-200">{categoryLabel}</td>
                <td className="p-3 text-gray-200">{p.contact_name || '—'}</td>
                <td className="p-3 text-gray-200">
                  <div>{p.email || '—'}</div>
                  <div className="text-xs text-gray-400">{p.phone || ''}</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 text-blue-300">
                    {p.instagram && (
                      <a
                        href={`https://instagram.com/${p.instagram.replace(/^@/, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {p.website && (
                      <a
                        href={/^https?:\/\//i.test(p.website) ? p.website : `https://${p.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline inline-flex items-center gap-1"
                      >
                        Web <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="p-3 text-gray-200">{p.location || '—'}</td>
                <td className="p-3">{statusChip(r.status || 'tentative', labelFromEventStatus)}</td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-2">
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
              <td colSpan={8} className="p-6 text-center text-gray-400">No hay proveedores</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
