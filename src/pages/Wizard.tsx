import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/apiClient'

type Inv = any

export default function Wizard() {
  const [params] = useSearchParams()
  const startType = params.get('type') || 'wedding'
  const [step, setStep] = useState(1)
  const [inv, setInv] = useState<Inv|null>(null)
  const [saving, setSaving] = useState(false)
  const nav = useNavigate()

  // start or load trial
  useEffect(() => {
    const token = localStorage.getItem('trial_token')
    if (!token) {
      api('/api/trial/start', { method: 'POST', body: JSON.stringify({ event_type: startType }) })
        .then(d => {
          localStorage.setItem('trial_token', d.trial_token)
          localStorage.setItem('trial_invitation_id', d.id)
          setInv({ id: d.id, title: 'Mi Evento', event_type: startType, language: 'es', parts: [] })
        })
    } else {
      api('/api/trial/get').then(setInv).catch(()=>{
        // token inválido: reiniciar
        localStorage.removeItem('trial_token')
        localStorage.removeItem('trial_invitation_id')
        window.location.reload()
      })
    }
  }, [startType])

  const save = async (partial?: any) => {
    if (!inv) return
    setSaving(true)
    const data = { ...inv, ...(partial||{}) }
    const res = await api('/api/trial/save', { method: 'PATCH', body: JSON.stringify(data) }).finally(()=>setSaving(false))
    setInv(res)
  }

  const addPart = () => {
    const order = inv?.parts?.length || 0
    setInv(prev => ({ ...(prev as any), parts: [ ...(prev?.parts||[]), { type: 'ceremony', date: '2025-12-31', time: '15:00', place_name: 'Lugar', address: 'Dirección', order } ] }))
  }

  const preview = () => {
    const token = localStorage.getItem('trial_token')
    if (token) nav('/preview/'+token)
  }

  const goCheckout = async () => {
    await save()
    nav('/checkout')
  }

  if (!inv) return <div className="container py-10">Cargando…</div>

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">Paso {step} de 3</div>
        <div className="flex gap-2">
          <button className="btn" onClick={preview}>Vista previa</button>
          <button className="btn btn-primary" onClick={goCheckout}>Publicar y compartir</button>
        </div>
      </div>

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <div className="font-medium">Datos básicos</div>
            <input className="input" placeholder="Título del evento" value={inv.title||''} onChange={e=>setInv({...inv, title:e.target.value})} />
            <textarea className="input" placeholder="Mensaje de introducción" value={inv.intro_message||''} onChange={e=>setInv({...inv, intro_message:e.target.value})}></textarea>
            <button className="btn btn-primary" onClick={()=>{ save(); setStep(2) }} disabled={saving}>Continuar</button>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Consejo</div>
            <p className="text-sm">No necesitas registrarte aún. Crea y personaliza tu tarjeta primero. Solo pagarás cuando quieras compartirla.</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <TemplatesStep value={inv.theme||'classic'} onSelect={(t)=>{ setInv({...inv, theme:t}); save({ theme: t }); setStep(3); }} />
      )}

      {step === 3 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <div className="font-medium">Imagen (URL)</div>
            <input className="input" placeholder="https://..." value={inv.hero_image_url||''} onChange={e=>setInv({...inv, hero_image_url:e.target.value})} />
            <div className="font-medium mt-2">Partes del evento</div>
            <button className="btn" onClick={addPart}>Agregar parte</button>
            <div className="space-y-2">
              {(inv.parts||[]).map((p:any, i:number)=>(
                <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2">
                  <select className="input" value={p.type} onChange={e=>{ const parts=[...inv.parts]; parts[i].type = e.target.value; setInv({...inv, parts}) }}>
                    <option value="ceremony">Ceremonia</option>
                    <option value="reception">Recepción</option>
                    <option value="other">Otro</option>
                  </select>
                  <input className="input" value={p.date} onChange={e=>{ const parts=[...inv.parts]; parts[i].date = e.target.value; setInv({...inv, parts}) }} />
                  <input className="input" value={p.time} onChange={e=>{ const parts=[...inv.parts]; parts[i].time = e.target.value; setInv({...inv, parts}) }} />
                  <input className="input col-span-2" value={p.place_name} onChange={e=>{ const parts=[...inv.parts]; parts[i].place_name = e.target.value; setInv({...inv, parts}) }} />
                  <input className="input col-span-2" value={p.address} onChange={e=>{ const parts=[...inv.parts]; parts[i].address = e.target.value; setInv({...inv, parts}) }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button className="btn" onClick={()=>setStep(2)}>Volver</button>
              <button className="btn btn-primary" onClick={()=>save()} disabled={saving}>Guardar cambios</button>
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">Previsualización rápida</div>
            <div className="text-sm">Usa el botón “Vista previa” para ver la tarjeta en pantalla completa.</div>
          </div>
        </div>
      )}
    </div>
  )
}

function TemplatesStep({ value, onSelect }: { value: string, onSelect: (t:string)=>void }) {
  const [templates, setTemplates] = useState<any[]>([])
  useEffect(()=>{ api('/api/templates').then(setTemplates) },[])
  return (
    <div className="container">
      <div className="grid md:grid-cols-3 gap-4">
        {templates.map(t => (
          <button key={t.id} className={"card text-left hover:shadow-md transition " + (value===t.id?'ring-2 ring-blue-600':'')} onClick={()=>onSelect(t.id)}>
            <img src={t.cover_image} alt={t.name} className="w-full h-40 object-cover rounded-xl mb-2"/>
            <div className="font-medium">{t.name}</div>
            <div className="text-xs text-gray-500">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}