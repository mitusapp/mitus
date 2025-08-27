import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function UserAuthLoginRegister() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [error, setError] = useState<string|null>(null)
  const navigate = useNavigate()

  const submit = async (e: any) => {
    e.preventDefault()
    setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      navigate('/owner-dashboard')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="container py-10 max-w-md">
      <h1 className="text-2xl font-semibold mb-4">{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} required />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="btn btn-primary w-full" type="submit">
          {mode === 'login' ? 'Ingresar' : 'Registrarme'}
        </button>
      </form>
      <div className="text-sm mt-4">
        {mode === 'login' ? (
          <button className="underline" onClick={()=>setMode('register')}>¿No tienes cuenta? Regístrate</button>
        ) : (
          <button className="underline" onClick={()=>setMode('login')}>¿Ya tienes cuenta? Inicia sesión</button>
        )}
      </div>
    </div>
  )
}