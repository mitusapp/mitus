import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  const svc = getClientAsService()
  const id = randomUUID()
  const token = randomUUID()
  const body = req.body || {}
  const insert = {
    id,
    user_id: null,
    title: body.title || 'Mi Evento',
    event_type: body.event_type || 'wedding',
    language: body.language || 'es',
    status: 'draft',
    theme: body.theme || 'classic',
    is_trial: true,
    trial_token: token,
    trial_expires_at: new Date(Date.now()+1000*60*60*24*3).toISOString(),
    payment_status: 'unpaid'
  }
  const { error } = await svc.from('invitations').insert(insert)
  if (error) return res.status(400).send(error.message)
  return res.status(201).json({ id, trial_token: token })
}