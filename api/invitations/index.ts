import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientFromRequest, allowCors, handleOptions } from '../_shared/supabase'
import { randomUUID } from 'crypto'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  const supabase = getClientFromRequest(req)

  if (req.method === 'GET') {
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return res.status(401).send('Unauthorized')
    const { data, error } = await supabase.from('invitations')
      .select('id, title, status, slug, created_at, updated_at, payment_status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) return res.status(400).send(error.message)
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) return res.status(401).send('Unauthorized')
    const body = req.body || {}
    const insert = {
      id: randomUUID(),
      user_id: user.id,
      title: body.title || 'Mi evento',
      event_type: body.event_type || 'wedding',
      language: body.language || 'es',
      status: 'draft',
      theme: body.theme || 'classic',
      is_trial: false,
      payment_status: 'paid'
    }
    const { data, error } = await supabase.from('invitations').insert(insert).select().single()
    if (error) return res.status(400).send(error.message)
    return res.status(201).json(data)
  }

  res.status(405).send('Method Not Allowed')
}