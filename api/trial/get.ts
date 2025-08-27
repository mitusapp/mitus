import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed')
  }

  const tokenQ = (req.query.token ?? '') as string

  try {
    const svc = getClientAsService()

    // Helper: ordenar partes por "order"
    const sortParts = (parts: any[] = []) =>
      parts.sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0))

    // 1) Si viene token, úsalo
    if (tokenQ) {
      const { data, error } = await svc
        .from('invitations')
        .select('*, parts:invitation_parts(*)')
        .eq('trial_token', tokenQ)
        .eq('is_trial', true)
        .single()

      if (error) return res.status(404).json({ error: error.message })
      return res
        .status(200)
        .json({ ...data, parts: sortParts(data?.parts) })
    }

    // 2) Fallback: tomar el borrador trial más reciente (user_id IS NULL)
    const { data: draft, error: dErr } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .is('user_id', null)
      .eq('is_trial', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!draft && dErr) {
      // 3) Si tampoco existe, auto-crear uno
      const newToken = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
      const { data: created, error: cErr } = await svc
        .from('invitations')
        .insert({
          title: 'Mi Evento',
          event_type: 'wedding',
          language: 'es',
          is_trial: true,
          trial_token: newToken
        })
        .select('*, parts:invitation_parts(*)')
        .single()

      if (cErr) return res.status(500).json({ error: cErr.message })
      return res.status(200).json({ ...created, parts: [] })
    }

    // Draft encontrado
    return res.status(200).json({ ...draft, parts: sortParts(draft?.parts) })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
