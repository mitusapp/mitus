// api/trial/start.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleOptions(req, res)) return
    allowCors(res)

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed')
    }

    const svc = getClientAsService()
    const body = (req.body as any) || {}

    const token =
      (globalThis as any).crypto?.randomUUID?.() ??
      Math.random().toString(36).slice(2)

    const insert = {
      user_id: null,
      title: body.title ?? 'Mi Evento',
      event_type: body.event_type ?? 'wedding',
      language: body.language ?? 'es',
      status: 'draft',
      theme: body.theme ?? 'classic',
      is_trial: true,
      trial_token: token,
      trial_expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // +3 días
      payment_status: 'unpaid',
    }

    const { data, error } = await svc
      .from('invitations')
      .insert(insert)
      .select('id, trial_token')
      .single()

    if (error) {
      console.error('Insert invitations error:', error)
      return res.status(400).send(error.message)
    }

    res.setHeader('Content-Type', 'application/json')
    return res.status(201).json({ id: data!.id, trial_token: data!.trial_token })
  } catch (e: any) {
    console.error('trial/start failed:', e?.message, e)
    return res.status(500).json({
      error: 'FUNCTION_INVOCATION_FAILED',
      details: e?.message ?? String(e),
    })
  }
}
