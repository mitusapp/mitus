import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method !== 'PATCH') return res.status(405).send('Method Not Allowed')

  const tokenQ = (req.query.token ?? '') as string

  try {
    const svc = getClientAsService()
    const body = (req.body || {}) as any

    // 1) Resolver invitación trial destino
    let invitationId: string | null = null
    let token: string | null = tokenQ || null

    if (token) {
      const { data: inv, error: invErr } = await svc
        .from('invitations')
        .select('id, trial_token')
        .eq('trial_token', token)
        .eq('is_trial', true)
        .single()
      if (invErr) return res.status(404).json({ error: invErr.message })
      invitationId = inv.id
      token = inv.trial_token
    } else {
      const { data: draft } = await svc
        .from('invitations')
        .select('id, trial_token')
        .is('user_id', null)
        .eq('is_trial', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (draft) {
        invitationId = draft.id
        token = draft.trial_token
      } else {
        const newToken = (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
        const { data: created, error: cErr } = await svc
          .from('invitations')
          .insert({
            title: body.title ?? 'Mi Evento',
            event_type: body.event_type ?? 'wedding',
            language: body.language ?? 'es',
            is_trial: true,
            trial_token: newToken,
            status: 'draft',
          })
          .select('id, trial_token')
          .single()
        if (cErr) return res.status(500).json({ error: cErr.message })
        invitationId = created.id
        token = created.trial_token
      }
    }

    // 2) Actualizar cabecera
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

    // 3) Reemplazar parts
    if (Array.isArray(body.parts)) {
      const { error: delErr } = await svc
        .from('invitation_parts')
        .delete()
        .eq('invitation_id', invitationId!)
      if (delErr) return res.status(400).json({ error: delErr.message })

      const partsToInsert = body.parts.map((p: any, idx: number) => ({
        type: p.type ?? null,
        date: p.date ?? null,
        time: p.time ?? null,
        // usamos place_name según tu esquema
        place_name: p.place_name ?? p.place ?? null,
        // "address" existe en tu tabla (lo vi en tu captura)
        address: p.address ?? null,
        notes: p.notes ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        // SOLO sort_order (no dependemos de "order")
        sort_order: Number.isInteger(p.sort_order) ? p.sort_order : (Number.isInteger(p.order) ? p.order : idx),
        invitation_id: invitationId!,
      }))

      const { error: insErr } = await svc.from('invitation_parts').insert(partsToInsert)
      if (insErr) return res.status(400).json({ error: insErr.message })
    }

    // 4) Responder normalizado
    const { data, error } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .eq('id', invitationId!)
      .single()
    if (error) return res.status(400).json({ error: error.message })

    const parts = (data?.parts || [])
      .map((p: any) => ({
        ...p,
        place: p.place ?? p.place_name ?? null,      // alias place
        order: p.order ?? p.sort_order ?? 0,         // alias order
      }))
      .sort((a: any, b: any) => (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0))

    return res.status(200).json({ ...data, parts, trial_token: token })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
