import { createClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'

export function getClientAsService() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export function getClientFromRequest(req: VercelRequest) {
  const url = process.env.SUPABASE_URL!
  const anon = process.env.VITE_SUPABASE_ANON_KEY || ''
  const token = (req.headers['authorization']||'').toString().replace('Bearer ','')
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
  return client
}

export function allowCors(res: any) {
  const allowed = (process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)
  if (allowed.length) res.setHeader('Access-Control-Allow-Origin', allowed[0])
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Trial-Token')
}

export function handleOptions(req: VercelRequest, res: any) {
  if (req.method === 'OPTIONS') {
    allowCors(res)
    res.status(200).send('ok')
    return true
  }
  return false
}