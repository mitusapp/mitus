import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  if (req.method !== 'PATCH') return res.status(405).send('Method Not Allowed')
  const token = String(req.headers['x-trial-token'] || '')
  if (!token) return res.status(401).send('Missing trial token')
  const body = req.body || {}
  const svc = getClientAsService()

  // Update invitation base fields
  const fields:any = {}
  for (const k of ['title','intro_message','theme','hero_image_url','language','event_type']) {
    if (k in body) fields[k] = body[k]
  }
  if (Object.keys(fields).length) {
    const { error } = await svc.from('invitations').update(fields).eq('trial_token', token).eq('is_trial', true)
    if (error) return res.status(400).send(error.message)
  }

  // Parts: replace all if provided
  if (Array.isArray(body.parts)) {
    const { data: inv, error: e0 } = await svc.from('invitations').select('id').eq('trial_token', token).eq('is_trial', true).single()
    if (e0) return res.status(400).send(e0.message)
    await svc.from('invitation_parts').delete().eq('invitation_id', inv.id)
    const ins = body.parts.map((p:any)=>({ ...p, invitation_id: inv.id }))
    if (ins.length) {
      const { error: e2 } = await svc.from('invitation_parts').insert(ins)
      if (e2) return res.status(400).send(e2.message)
    }
  }

  const { data, error } = await svc.from('invitations').select('*, parts:invitation_parts(*)').eq('trial_token', token).eq('is_trial', true).single()
  if (error) return res.status(400).send(error.message)
  data.parts = (data.parts||[]).sort((a:any,b:any)=>a.order-b.order)
  return res.status(200).json(data)
}