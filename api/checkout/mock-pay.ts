import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  if (process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== 'mock') {
    return res.status(400).send('PAYMENT_PROVIDER no es mock')
  }
  const { token } = req.body || {}
  if (!token) return res.status(400).send('Missing token')
  const svc = getClientAsService()
  const { error } = await svc.from('invitations').update({ payment_status: 'paid' }).eq('trial_token', token).eq('is_trial', true)
  if (error) return res.status(400).send(error.message)
  res.status(200).json({ ok: true })
}