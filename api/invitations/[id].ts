import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientFromRequest, allowCors, handleOptions } from '../_shared/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  const supabase = getClientFromRequest(req)
  const id = (req.query.id as string) || ''

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return res.status(401).send('Unauthorized')

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('invitations')
      .select('*, parts:invitation_parts(*)')
      .eq('id', id).eq('user_id', user.id).single()
    if (error) return res.status(400).send(error.message)
    return res.status(200).json({ ...data, parts: data.parts?.sort((a:any,b:any)=>a.order-b.order) || [] })
  }

  if (req.method === 'PATCH') {
    const body = req.body || {}
    const fields = {
      title: body.title,
      intro_message: body.intro_message,
      theme: body.theme,
      hero_image_url: body.hero_image_url
    }
    let { error } = await supabase.from('invitations').update(fields).eq('id', id).eq('user_id', user.id)
    if (error) return res.status(400).send(error.message)

    if (Array.isArray(body.parts)) {
      await supabase.from('invitation_parts').delete().eq('invitation_id', id)
      const parts = body.parts.map((p:any)=>({ ...p, invitation_id: id }))
      const { error: perr } = await supabase.from('invitation_parts').insert(parts)
      if (perr) return res.status(400).send(perr.message)
    }

    const { data, error: e2 } = await supabase.from('invitations')
      .select('*, parts:invitation_parts(*)').eq('id', id).eq('user_id', user.id).single()
    if (e2) return res.status(400).send(e2.message)
    return res.status(200).json({ ...data, parts: data.parts?.sort((a:any,b:any)=>a.order-b.order) || [] })
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('invitations').delete().eq('id', id).eq('user_id', user.id)
    if (error) return res.status(400).send(error.message)
    return res.status(204).send('')
  }

  res.status(405).send('Method Not Allowed')
}