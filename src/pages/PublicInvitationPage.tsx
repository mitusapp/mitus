import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

export default function PublicInvitationPage() {
  const { slug } = useParams<{slug: string}>()
  const [inv, setInv] = useState<any>(null)
  const [error, setError] = useState<string| null>(null)

  useEffect(() => {
    async function load() {
      setError(null)
      try {
        const r = await fetch(`/api/public/invitations/${slug}`)
        if (!r.ok) throw new Error(await r.text())
        setInv(await r.json())
      } catch (e:any) {
        setError(e.message)
      }
    }
    load()
  }, [slug])

  const mainDate = useMemo(()=>inv?.parts?.[0]?.date, [inv])
  const mainTime = useMemo(()=>inv?.parts?.[0]?.time, [inv])

  const submitRSVP = async (e:any) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const payload = {
      slug: slug || '',
      name: form.get('name'),
      email: form.get('email'),
      attending: form.get('attending')
    }
    try {
      const res = await fetch('/api/rsvps', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(await res.text())
      alert('¡Gracias por confirmar!')
      ;(e.target as HTMLFormElement).reset()
    } catch (e:any) {
      alert(e.message)
    }
  }

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
            <div>{mainDate} {mainTime ? `• ${mainTime}` : ''}</div>
            <div className="text-gray-600">{inv.parts?.[0]?.place_name} — {inv.parts?.[0]?.address}</div>
            <div className="text-sm">
              <a className="underline" href={"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(inv.parts?.[0]?.address || '')} target="_blank">Ver en Google Maps</a>
            </div>
          </div>
          <form className="card space-y-2" onSubmit={submitRSVP}>
            <div className="font-medium">Confirmar asistencia (RSVP)</div>
            <input name="name" className="input" placeholder="Tu nombre" required />
            <input name="email" className="input" placeholder="Tu email (opcional)" />
            <select name="attending" className="input">
              <option value="yes">Asistiré</option>
              <option value="no">No podré</option>
              <option value="maybe">Tal vez</option>
            </select>
            <button className="btn btn-primary">Enviar</button>
          </form>
        </div>
      </div>
    </div>
  )
}