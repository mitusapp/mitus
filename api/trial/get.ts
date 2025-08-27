import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  const token = String(req.headers['x-trial-token'] || '')
  if (!token) return res.status(401).send('Missing trial token')
  const svc = getClientAsService()
  const { data, error } = await svc.from('invitations').select('*, parts:invitation_parts(*)').eq('trial_token', token).eq('is_trial', true).single()
  if (error) return res.status(400).send(error.message)
  const now = new Date()
  if (data.trial_expires_at && new Date(data.trial_expires_at) < now) return res.status(410).send('Trial expirado')
  data.parts = (data.parts||[]).sort((a:any,b:any)=>a.order-b.order)
  res.status(200).json(data)
}