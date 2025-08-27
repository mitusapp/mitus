import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, getClientFromRequest, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)

  if (req.method === 'POST') {
    const svc = getClientAsService()
    const { slug, name, email, phone, attending, party_size, message } = req.body || {}
    if (!slug || !name || !attending) return res.status(400).send('Datos incompletos')
    const { data: inv, error: e1 } = await svc.from('invitations').select('id').eq('slug', slug).eq('status','published').single()
    if (e1) return res.status(404).send('Invitación no encontrada')
    const insert = { invitation_id: inv.id, name, email, phone, attending, party_size, message }
    const { error: e2 } = await svc.from('rsvps').insert(insert)
    if (e2) return res.status(400).send(e2.message)
    return res.status(201).json({ ok: true })
  }

  if (req.method === 'GET') {
    const client = getClientFromRequest(req)
    const { data: { user }, error: uerr } = await client.auth.getUser()
    if (uerr || !user) return res.status(401).send('Unauthorized')
    const invitationId = (req.query.invitationId as string) || ''
    if (!invitationId) return res.status(400).send('Missing invitationId')
    const { data, error } = await client.from('rsvps')
      .select('*').eq('invitation_id', invitationId).order('created_at', { ascending: false })
    if (error) return res.status(400).send(error.message)
    return res.status(200).json(data)
  }

  res.status(405).send('Method Not Allowed')
}