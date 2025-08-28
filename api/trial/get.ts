// api/trial/get.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

function headerToken(req: VercelRequest): string {
  // Headers vienen en minúsculas en Node
  const raw = req.headers['x-trial-token'] as string | string[] | undefined
  return Array.isArray(raw) ? raw[0] : String(raw || '')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' })

  // Token por query o por header (preferencia: query)
  const tokenQ = String(req.query.token ?? '')
  const tokenH = headerToken(req)
  const token = (tokenQ || tokenH).trim()

  try {
    const svc = getClientAsService()

    const normalize = (parts: any[] = []) =>
      parts
        .map((p: any) => ({
          ...p,
          // alias para compatibilidad con el front
          place: p.place ?? p.place_name ?? null,
          order: p.order ?? p.sort_order ?? 0,
        }))
        .sort(
          (a: any, b: any) =>
            (a.sort_order ?? a.order ?? 0) - (b.sort_order ?? b.order ?? 0)
        )

    // 1) Con token explícito (query o header): devolver esa trial
    if (token) {
      const { data, error } = await svc
        .from('invitations')
        .select('*, parts:invitation_parts(*)')
        .eq('trial_token', token)
        .eq('is_trial', true)
        .single()

      if (error) return res.status(404).json({ error: error.message })
      return res.status(200).json({ ...data, parts: normalize(data?.parts) })
    }

    // 2) Sin token: crear SIEMPRE una nueva trial (sin reutilizar borradores)
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
        // opcional: alinear con /api/trial/start
        // theme: 'classic',
        // trial_expires_at: new Date(Date.now() + 1000*60*60*24*3).toISOString(),
        // payment_status: 'unpaid',
      })
      .select('*, parts:invitation_parts(*)')
      .single()

    if (cErr) return res.status(500).json({ error: cErr.message })

    // nueva invitación empieza sin partes
    return res.status(200).json({ ...created, parts: [] })
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) })
  }
}
