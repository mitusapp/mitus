// api/trial/get.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

function headerToken(req: VercelRequest): string {
  const raw = (req.headers['x-trial-token'] ?? req.headers['x-trial'] ?? '') as string | string[]
  return Array.isArray(raw) ? raw[0] : String(raw || '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

  // token por query o por header (preferencia: query)
  const tokenQ = String(req.query.token ?? '')
  const tokenH = headerToken(req)
  const token = tokenQ || tokenH

  try {
    const svc = getClientAsService()

    const normalize = (parts: any[] = []) =>
      parts
        .map((p: any) => ({
          ...p,
          // alias para compatibilidad si el front espera "place" u "order"
          place: p.place ?? p.place_name ?? null,
          order: p.order ?? p.sort_order ?? 0,
        }))
        .sort(
          (a: any, b: any) =>
            (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0)
        )

    // 1) Con token explícito (query o header)
    if (token) {
      const { data, error } = await svc
        .from('invitations')
        .select('*, parts:invitation_parts(*)')
        .eq('trial_token', token)
        .eq('is_trial', true)
        .single()

      if (error) return res.status(404).json({ error: error.message })
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json({ ...data, parts: normalize(data?.parts) })
    }

    // 2) Fallback: último borrador trial (user_id IS NULL)
    const { data: draft } = await svc
      .from('invitations')
      .select('*, parts:invitation_parts(*)')
      .is('user_id', null)
      .eq('is_trial', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!draft) {
      // 3) Crear uno nuevo si no existe ninguno
      const newToken =
        (globalThis as any).crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2)

      const { data: created, error: cErr } = await svc
        .from('invitations')
        .insert({
          title: 'Mi Evento',
          event_type: 'wedding',
          language: 'es',
          is_trial: true,
          trial_token: newToken,
          status: 'draft',
        })
        .select('*, parts:invitation_parts(*)')
        .single()

      if (cErr) return res.status(500).json({ error: cErr.message })
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json({ ...created, parts: [] })
    }

    res.setHeader('Content-Type', 'application/json')
    return res.status(200).json({ ...draft, parts: normalize(draft?.parts) })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
