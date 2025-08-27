import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method !== 'PATCH') {
    return res.status(405).send('Method Not Allowed')
  }

  const token = String(req.query.token || '')
  if (!token) return res.status(400).send('Missing trial token')

  try {
    const svc = getClientAsService()
    const body = (req.body || {}) as any

    // Update invitation
    const fields: Record<string, any> = {}
    if (body.title !== undefined) fields.title = body.title
    if (body.intro_message !== undefined) fields.intro_message = body.intro_message
    if (body.theme !== undefined) fields.theme = body.theme
    if (body.hero_image_url !== undefined) fields.hero_image_url = body.hero_image_url

    if (Object.keys(fields).length) {
      const { error: upErr } = await svc
        .from('invitations')
        .update(fields)
        .eq('trial_token', token)
        .eq('is_trial', true)
      if (upErr) return res.status(400).json({ error: upErr.message })
    }

    // Replace parts if provided
    if (Array.isArray(body.parts)) {
      const { data: inv, error: invErr } = await svc
        .from('invitations')
        .select('id')
        .eq('trial_token', token)
        .eq('is_trial', true)
        .single()
      if (invErr) return res.status(404).json({ error: invErr.message })

      await svc.from('invitation_parts').delete().eq('invitation_id', inv.id)

      const partsToInsert = body.parts.map((p: any, idx: number) => ({
        type: p.type ?? null,
        date: p.date ?? null,
        time: p.time ?? null,
        place: p.place ?? null,
        notes: p.notes ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        order: Number.isInteger(p.order) ? p.order : idx,
        invitation_id: inv.id
      }))

      const { error: insErr } = await svc.from('invitation_parts').insert(partsToInsert)
      if (insErr) return res.status(400).json({ error: insErr.message })
    }

    // Return updated
    const { data, error } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .eq('trial_token', token)
      .eq('is_trial', true)
      .single()
    if (error) return res.status(400).json({ error: error.message })

    const parts = (data?.parts || []).sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)
    )

    return res.status(200).json({ ...data, parts })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
