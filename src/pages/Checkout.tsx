import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/apiClient'
import { supabase } from '../lib/supabaseClient'

export default function Checkout() {
  const [user, setUser] = useState<any>(null)
  const [status, setStatus] = useState<string>('')
  const nav = useNavigate()

  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null))
  },[])

  const login = async (e:any) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const email = String(form.get('email')||'')
    const password = String(form.get('password')||'')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return alert(error.message)
    setUser((await supabase.auth.getUser()).data.user)
  }

  const register = async (e:any) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const email = String(form.get('email')||'')
    const password = String(form.get('password')||'')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return alert(error.message)
    setUser((await supabase.auth.getUser()).data.user)
  }

  const pay = async () => {
    try {
      setStatus('Procesando pago…')
      const token = localStorage.getItem('trial_token')
      if (!token) throw new Error('No hay token de prueba')
      // Modo mock: marca pagado, reclama la invitación y publica
      await api('/api/checkout/mock-pay', { method: 'POST', body: JSON.stringify({ token }) })
      await api('/api/trial/claim', { method: 'POST', body: JSON.stringify({ token }) })
      const id = localStorage.getItem('trial_invitation_id')
      const res = await api('/api/invitations/publish', { method: 'POST', body: JSON.stringify({ id }) })
      // limpiar trial
      localStorage.removeItem('trial_token'); localStorage.removeItem('trial_invitation_id')
      nav('/i/'+res.slug)
    } catch (e:any) {
      setStatus(e.message)
    }
  }

  return (
    <div className="container py-10 grid md:grid-cols-2 gap-8">
      <div className="card">
        <div className="font-medium mb-2">1) Crea tu cuenta o ingresa</div>
        {!user ? (
          <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={login} className="space-y-2">
              <div className="text-sm font-medium">Ingresar</div>
              <input name="email" required className="input" placeholder="Email" />
              <input name="password" required type="password" className="input" placeholder="Contraseña" />
              <button className="btn btn-primary w-full">Ingresar</button>
            </form>
            <form onSubmit={register} className="space-y-2">
              <div className="text-sm font-medium">Crear cuenta</div>
              <input name="email" required className="input" placeholder="Email" />
              <input name="password" required type="password" className="input" placeholder="Contraseña" />
              <button className="btn w-full">Registrarme</button>
            </form>
          </div>
        ) : (
          <div className="text-sm">Sesión iniciada como <b>{user.email}</b>.</div>
        )}
      </div>

      <div className="card">
        <div className="font-medium mb-2">2) Pago</div>
        <p className="text-sm text-gray-600 mb-3">Para esta demo se usa modo <b>mock</b>. Al pagar se marcará tu invitación como “pagada” y podrás publicarla de inmediato.</p>
        <button className="btn btn-primary" disabled={!user} onClick={pay}>Pagar (modo demo)</button>
        {status && <div className="text-sm mt-2">{status}</div>}
      </div>
    </div>
  )
}