import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientAsService, allowCors, handleOptions } from '../../_shared/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  const supabase = getClientAsService()
  const slug = (req.query.slug as string) || ''

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('invitations')
      .select('id, title, intro_message, hero_image_url, slug, status, payment_status, parts:invitation_parts(*)')
      .eq('slug', slug).eq('status','published').single()
    if (error) return res.status(404).send('No encontrada')
    if (data.payment_status !== 'paid') return res.status(403).send('No disponible')
    data.parts = (data.parts||[]).sort((a:any,b:any)=>a.order-b.order)
    return res.status(200).json(data)
  }

  res.status(405).send('Method Not Allowed')
}