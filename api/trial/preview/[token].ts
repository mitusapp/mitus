import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method !== 'GET') {
    res.status(405).send('Method Not Allowed')
    return
  }

  const token = String(req.query.token || '')
  if (!token) {
    res.status(400).send('Missing trial token')
    return
  }

  try {
    const svc = getClientAsService()

    const { data, error } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .eq('trial_token', token)
      .eq('is_trial', true)
      .single()

    if (error) {
      res.status(404).json({ error: error.message })
      return
    }

    if (data.trial_expires_at && new Date(data.trial_expires_at) < new Date()) {
      res.status(410).json({ error: 'Trial expired' })
      return
    }

    const parts = (data?.parts || []).sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    )

    res.setHeader('Content-Type', 'application/json')
    res.status(200).json({ ...data, parts })
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message || err) })
  }
}
