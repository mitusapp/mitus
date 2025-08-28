// api/trial/save.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method !== 'PATCH') return res.status(405).send('Method Not Allowed')

  // 1) Token OBLIGATORIO: header X-Trial-Token o query ?token=
  const tokenQ = (req.query.token ?? '') as string
  const tokenH = (req.headers['x-trial-token'] ?? '') as string // headers vienen en minúsculas
  const token = String(tokenQ || tokenH || '').trim()
  if (!token) {
    return res.status(400).json({ error: 'Missing X-Trial-Token' })
  }

  try {
    const svc = getClientAsService()
    const body = (req.body || {}) as any

    // 2) Resolver invitación trial destino SOLO por token (sin fallbacks)
    const { data: inv, error: invErr } = await svc
      .from('invitations')
      .select('id, trial_token')
      .eq('trial_token', token)
      .eq('is_trial', true)
      .single()

    if (invErr || !inv) return res.status(404).json({ error: invErr?.message || 'Trial not found' })
    const invitationId = inv.id

    // 3) Actualizar cabecera SOLO con campos existentes
    const fields: Record<string, any> = {}
    if (body.title !== undefined) fields.title = body.title
    if (body.intro_message !== undefined) fields.intro_message = body.intro_message
    if (body.theme !== undefined) fields.theme = body.theme
    if (body.hero_image_url !== undefined) fields.hero_image_url = body.hero_image_url
    if (body.event_type !== undefined) fields.event_type = body.event_type
    if (body.language !== undefined) fields.language = body.language

    if (Object.keys(fields).length) {
      const { error: upErr } = await svc
        .from('invitations')
        .update(fields)
        .eq('id', invitationId)
        .eq('is_trial', true)

      if (upErr) return res.status(400).json({ error: upErr.message })
    }

    // 4) Reemplazar parts (alineado a place_name y sort_order)
    if (Array.isArray(body.parts)) {
      const { error: delErr } = await svc
        .from('invitation_parts')
        .delete()
        .eq('invitation_id', invitationId)
      if (delErr) return res.status(400).json({ error: delErr.message })

      const partsToInsert = body.parts.map((p: any, idx: number) => ({
        type: p.type ?? null,
        date: p.date ?? null,
        time: p.time ?? null,
        place_name: p.place_name ?? p.place ?? null,
        address: p.address ?? null,
        notes: p.notes ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        sort_order: Number.isInteger(p.sort_order)
          ? p.sort_order
          : Number.isInteger(p.order)
          ? p.order
          : idx,
        invitation_id: invitationId,
      }))

      const { error: insErr } = await svc
        .from('invitation_parts')
        .insert(partsToInsert)
      if (insErr) return res.status(400).json({ error: insErr.message })
    }

    // 5) Responder normalizado para el front
    const { data, error } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .eq('id', invitationId)
      .single()

    if (error) return res.status(400).json({ error: error.message })

    const parts = (data?.parts || [])
      .map((p: any) => ({
        ...p,
        place: p.place ?? p.place_name ?? null, // alias solo en la respuesta
        order: p.order ?? p.sort_order ?? 0,
      }))
      .sort(
        (a: any, b: any) =>
          (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0)
      )

    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({ ...data, parts, trial_token: token })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
