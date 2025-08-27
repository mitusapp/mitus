import { Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { useEffect, useState } from 'react'
import { setAccessToken } from './apiClient'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setAccessToken(data.session?.access_token ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
    })
    return () => { sub.subscription.unsubscribe() }
  }, [])

  return { user, loading }
}

export function ProtectedRoute({ children }: { children: any }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container py-10">Cargando…</div>
  if (!user) return <Navigate to="/user-authentication-login-register" />
  return children
}