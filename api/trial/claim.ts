import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, getClientFromRequest, allowCors, handleOptions } from '../_shared/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')
  const client = getClientFromRequest(req)
  const { data: { user }, error: uerr } = await client.auth.getUser()
  if (uerr || !user) return res.status(401).send('Unauthorized')
  const token = (req.body||{}).token || String(req.headers['x-trial-token']||'')
  if (!token) return res.status(400).send('Missing token')

  const svc = getClientAsService()
  const { data: inv, error } = await svc.from('invitations').select('id, payment_status').eq('trial_token', token).eq('is_trial', true).single()
  if (error) return res.status(404).send('Draft no encontrado')
  if (inv.payment_status !== 'paid') return res.status(402).send('Pago requerido')

  const { error: e2 } = await svc.from('invitations').update({ user_id: user.id, is_trial: false }).eq('id', inv.id)
  if (e2) return res.status(400).send(e2.message)
  res.status(200).json({ ok: true, id: inv.id })
}