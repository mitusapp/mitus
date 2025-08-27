import { createClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'

export function getClientAsService() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  // Cliente de servicio: sin persistencia de sesión en funciones
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export function getClientFromRequest(req: VercelRequest) {
  const url = process.env.SUPABASE_URL!
  // Fallback robusto para el anon key (Vercel env vs. Vite env)
  const anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''

  // Tomamos el token si viene en Authorization: Bearer <jwt>
  const authHeader = (req.headers['authorization'] || '').toString()
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : ''

  const headers: Record<string, string> = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const client = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: { headers },
  })
  return client
}

export function allowCors(res: any) {
  const raw = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // Soporta '*' o primer origin explícito
  if (raw.length) {
    const origin = raw[0]
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  // Evita problemas de caché por origen
  res.setHeader('Vary', 'Origin')

  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Trial-Token'
  )
}

export function handleOptions(req: VercelRequest, res: any) {
  if (req.method === 'OPTIONS') {
    allowCors(res)
    res.status(200).send('ok')
    return true
  }
  return false
}
