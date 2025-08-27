import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function PreviewTrialPage() {
  const { token } = useParams<{token: string}>()
  const [inv, setInv] = useState<any>(null)
  const [error, setError] = useState<string|null>(null)

  useEffect(()=>{
    fetch('/api/trial/preview/'+token).then(async r=>{
      if (!r.ok) throw new Error(await r.text())
      return r.json()
    }).then(setInv).catch(e=>setError(String(e.message||e)))
  }, [token])

  if (error) return <div className="container py-10 text-red-600">{error}</div>
  if (!inv) return <div className="container py-10">Cargando…</div>

  return (
    <div>
      <div className="h-64 md:h-96 w-full bg-gray-100 flex items-center justify-center">
        {inv.hero_image_url ? <img src={inv.hero_image_url} className="w-full h-full object-cover" /> : <div className="text-gray-500">Sin imagen</div>}
      </div>
      <div className="container py-8">
        <h1 className="text-3xl font-semibold mb-2">{inv.title}</h1>
        <p className="text-gray-700 mb-6">{inv.intro_message}</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card space-y-2">
            <div className="font-medium">Fecha y lugar</div>
            <div>{inv.parts?.[0]?.date} • {inv.parts?.[0]?.time}</div>
            <div className="text-gray-600">{inv.parts?.[0]?.place_name} — {inv.parts?.[0]?.address}</div>
          </div>
          <div className="card space-y-2">
            <div className="font-medium">Vista previa</div>
            <div className="text-sm text-gray-600">Esta es una vista previa temporal de tu tarjeta. Para publicarla y compartir el link, vuelve al asistente y selecciona “Publicar y compartir”.</div>
          </div>
        </div>
      </div>
    </div>
  )
}