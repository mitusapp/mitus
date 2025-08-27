import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'
import { Link } from 'react-router-dom'

export default function OwnerDashboard() {
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/invitations').then(setInvitations).finally(()=>setLoading(false))
  }, [])

  if (loading) return <div className="container py-10">Cargando…</div>

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold mb-6">Mis invitaciones</h1>
      <div className="space-y-3">
        {invitations.map(inv => (
          <div key={inv.id} className="card flex items-center justify-between">
            <div>
              <div className="font-medium">{inv.title}</div>
              <div className="text-sm text-gray-500">{inv.status} {inv.slug ? `• /i/${inv.slug}`:''}</div>
            </div>
            <div className="flex gap-2">
              <Link to={`/invitation-editor/${inv.id}`} className="btn">Editar</Link>
              {inv.slug && <a className="btn btn-primary" href={`/i/${inv.slug}`} target="_blank">Ver pública</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}