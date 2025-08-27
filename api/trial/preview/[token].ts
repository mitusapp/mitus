// api/trial/preview/[token].ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const token = String(req.query.token ?? '')
  if (!token) return res.status(400).json({ error: 'Missing trial token' })

  try {
    const svc = getClientAsService()
    const { data, error } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .eq('trial_token', token)
      .eq('is_trial', true)
      .single()

    if (error) return res.status(404).json({ error: error.message })

    if (data?.trial_expires_at && new Date(data.trial_expires_at) < new Date()) {
      return res.status(410).json({ error: 'Trial expired' })
    }

    const parts = (data?.parts ?? [])
      .map((p: any) => ({
        ...p,
        // alias de compatibilidad
        place: p.place ?? p.place_name ?? null,
        order: p.order ?? p.sort_order ?? 0,
      }))
      .sort(
        (a: any, b: any) =>
          (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0)
      )

    return res.status(200).json({ ...data, parts })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message ?? err) })
  }
}
