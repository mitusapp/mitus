import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

type InvitationPart = {
  date?: string | null
  time?: string | null
  place_name?: string | null
  address?: string | null
  sort_order?: number | null
  order?: number | null // viene como alias desde el API, pero no dependemos de esto
}

type Invitation = {
  title?: string | null
  intro_message?: string | null
  hero_image_url?: string | null
  parts?: InvitationPart[]
}

export default function PreviewTrialPage() {
  const { token } = useParams<{ token: string }>()
  const [inv, setInv] = useState<Invitation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return // evita /undefined en el primer render

    const ac = new AbortController()
    ;(async () => {
      try {
        const res = await fetch(`/api/trial/preview/${encodeURIComponent(token)}`, {
          signal: ac.signal,
          cache: 'no-store',
        })
        const ctype = res.headers.get('content-type') || ''
        const payload = ctype.includes('application/json') ? await res.json() : await res.text()

        if (!res.ok) {
          const msg = typeof payload === 'string'
            ? payload.slice(0, 200)
            : payload?.error || `HTTP ${res.status}`
          throw new Error(msg)
        }

        setInv(payload as Invitation)
        setError(null)
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setError(String(err?.message || err))
        setInv(null)
      }
    })()

    return () => ac.abort()
  }, [token])

  const firstPart = useMemo(() => {
    if (!inv?.parts?.length) return null
    // aunque el API ya ordena, nos aseguramos aquí por si acaso
    const sorted = [...inv.parts].sort(
      (a, b) =>
        (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0)
    )
    return sorted[0] || null
  }, [inv])

  if (error) {
    return (
      <div className="container py-10 text-red-600">
        {error}
      </div>
    )
  }

  if (!inv) {
    return <div className="container py-10">Cargando…</div>
  }

  return (
    <div>
      <div className="h-64 md:h-96 w-full bg-gray-100 flex items-center justify-center">
        {inv.hero_image_url ? (
          <img src={inv.hero_image_url} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-500">Sin imagen</div>
        )}
      </div>

      <div className="container py-8">
        <h1 className="text-3xl font-semibold mb-2">{inv.title}</h1>
        <p className="text-gray-700 mb-6">{inv.intro_message}</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card space-y-2">
            <div className="font-medium">Fecha y lugar</div>
            <div>
              {firstPart?.date} • {firstPart?.time}
            </div>
            <div className="text-gray-600">
              {firstPart?.place_name} — {firstPart?.address}
            </div>
          </div>

          <div className="card space-y-2">
            <div className="font-medium">Vista previa</div>
            <div className="text-sm text-gray-600">
              Esta es una vista previa temporal de tu tarjeta. Para publicarla y compartir el link, vuelve al asistente y selecciona “Publicar y compartir”.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
