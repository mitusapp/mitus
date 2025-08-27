import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientFromRequest, getClientAsService, allowCors, handleOptions } from '../_shared/supabase'
import bcrypt from 'bcryptjs'

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    .slice(0, 60)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const { id, passcode } = req.body || {}
  if (!id) return res.status(400).send('Missing id')

  const svc = getClientAsService()
  const { data: inv, error } = await svc.from('invitations').select('id,title,payment_status,status').eq('id', id).single()
  if (error) return res.status(400).send(error.message)
  if (inv.payment_status !== 'paid') return res.status(402).send('Pago requerido')

  const raw = slugify(inv.title || 'evento')
  let candidate = raw, i = 1
  while (true) {
    const { data: exists, error: e2 } = await svc.from('invitations').select('id').eq('slug', candidate).maybeSingle()
    if (e2) return res.status(400).send(e2.message)
    if (!exists) break
    candidate = `${raw}-${i++}`
  }

  const update: any = { status: 'published', slug: candidate, passcode_required: !!passcode }
  if (passcode) update.passcode_hash = await bcrypt.hash(passcode, 10)
  const { error: e3 } = await svc.from('invitations').update(update).eq('id', id)
  if (e3) return res.status(400).send(e3.message)

  return res.status(200).json({ slug: candidate })
}