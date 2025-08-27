import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  const svc = getClientAsService()
  const token = (req.query.token as string)||''
  const { data, error } = await svc.from('invitations').select('id,title,intro_message,hero_image_url,parts:invitation_parts(*)').eq('trial_token', token).eq('is_trial', true).single()
  if (error) return res.status(404).send('No encontrada')
  data.parts = (data.parts||[]).sort((a:any,b:any)=>a.order-b.order)
  res.status(200).json(data)
}