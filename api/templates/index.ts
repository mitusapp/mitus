import type { VercelRequest, VercelResponse } from '@vercel/node'
import { allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return
  allowCors(res)
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')
  const data = [
    { id: 'classic', name: 'Clásica', description: 'Diseño atemporal', cover_image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac' },
    { id: 'minimal', name: 'Minimal', description: 'Tipografía limpia', cover_image: 'https://images.unsplash.com/photo-1544957993-204fcb74d1a0' },
    { id: 'rustic', name: 'Rústica', description: 'Texturas orgánicas', cover_image: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2' }
  ]
  res.status(200).json(data)
}