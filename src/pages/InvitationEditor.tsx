import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'

export default function InvitationEditor() {
  const { id } = useParams<{id: string}>()
  const navigate = useNavigate()
  const [inv, setInv] = useState<any>(null)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    api(`/api/invitations/${id}`).then(setInv).catch(err=>setStatus(err.message))
  }, [id])

  const save = async () => {
    setStatus('Guardando…')
    try {
      await api(`/api/invitations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(inv)
      })
      setStatus('Guardado ✓')
      setTimeout(()=>setStatus(''), 1500)
    } catch (e: any) {
      setStatus(e.message)
    }
  }

  const addPart = () => {
    const order = inv.parts?.length || 0
    setInv({ ...inv, parts: [...(inv.parts||[]), { type: 'ceremony', date: '2025-12-31', time: '15:00', place_name: 'Lugar', address: 'Dirección', order }] })
  }

  const publish = async () => {
    const passcode = window.prompt('Passcode (opcional, dejar vacío si no):') || ''
    const res = await api('/api/invitations/publish', {
      method: 'POST',
      body: JSON.stringify({ id, passcode: passcode.trim() || null })
    })
    alert('Publicado: ' + window.location.origin + '/i/' + res.slug)
    navigate(`/i/${res.slug}`)
  }

  if (!inv) return <div className="container py-10">Cargando…</div>

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editor: {inv.title}</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={save}>Guardar</button>
          <button className="btn btn-primary" onClick={publish}>Publicar</button>
        </div>
      </div>
      {status && <div className="text-sm text-gray-600">{status}</div>}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <label className="block text-sm">Título
            <input className="input" value={inv.title||''} onChange={e=>setInv({...inv, title:e.target.value})} />
          </label>
          <label className="block text-sm">Mensaje de introducción
            <textarea className="input" value={inv.intro_message||''} onChange={e=>setInv({...inv, intro_message:e.target.value})} />
          </label>
          <label className="block text-sm">Tema
            <input className="input" value={inv.theme||''} onChange={e=>setInv({...inv, theme:e.target.value})} />
          </label>
          <label className="block text-sm">Imagen (URL)
            <input className="input" value={inv.hero_image_url||''} onChange={e=>setInv({...inv, hero_image_url:e.target.value})} />
          </label>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Partes del evento</div>
            <button className="btn" onClick={addPart}>Agregar parte</button>
          </div>
          <div className="space-y-3">
            {(inv.parts||[]).map((p:any, idx:number)=>(
              <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <select className="input" value={p.type} onChange={e=>{
                  const parts = [...inv.parts]; parts[idx].type = e.target.value; setInv({...inv, parts})
                }}>
                  <option value="ceremony">Ceremonia</option>
                  <option value="reception">Recepción</option>
                  <option value="other">Otro</option>
                </select>
                <input className="input" value={p.date} onChange={e=>{ const parts = [...inv.parts]; parts[idx].date = e.target.value; setInv({...inv, parts})}}/>
                <input className="input" value={p.time} onChange={e=>{ const parts = [...inv.parts]; parts[idx].time = e.target.value; setInv({...inv, parts})}}/>
                <input className="input col-span-2" value={p.place_name} onChange={e=>{ const parts = [...inv.parts]; parts[idx].place_name = e.target.value; setInv({...inv, parts})}}/>
                <input className="input col-span-2" value={p.address} onChange={e=>{ const parts = [...inv.parts]; parts[idx].address = e.target.value; setInv({...inv, parts})}}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}