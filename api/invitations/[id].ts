import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getClientFromRequest, getClientAsService, allowCors, handleOptions } from '../_shared/supabase.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS / preflight
  if (handleOptions && handleOptions(req, res)) return
  allowCors(res)

  const id = (req.query.id as string) || ''
  if (!id) {
    res.status(400).json({ error: 'Missing invitation id' })
    return
  }

  // Cliente con auth del request (anon o con bearer)
  const supa = getClientFromRequest(req)
  // Cliente de servicio (omite RLS si fuera necesario para lectura pública/trial)
  const service = getClientAsService()

  // Intentar resolver usuario (si hay bearer)
  const { data: authData, error: authErr } = await supa.auth.getUser()
  const user = authErr ? null : authData?.user ?? null
  const userId = user?.id ?? null

  // ---------- READ (GET) ----------
  if (req.method === 'GET') {
    try {
      // Si hay usuario autenticado: puede leer su propia invitación
      if (userId) {
        const { data, error } = await supa
          .from('invitations')
          .select('*, parts:invitation_parts(*)')
          .eq('id', id)
          .eq('user_id', userId)
          .single()

        if (error) return res.status(404).json({ error: error.message })

        const parts = (data?.parts ?? []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        return res.status(200).json({ ...data, parts })
      }

      // Sin usuario: permitir vista previa SOLO si es trial (user_id IS NULL)
      const { data, error } = await service
        .from('invitations')
        .select('*, parts:invitation_parts(*)')
        .eq('id', id)
        .is('user_id', null) // trial/public preview
        .single()

      if (error) return res.status(404).json({ error: error.message })

      const parts = (data?.parts ?? []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      return res.status(200).json({ ...data, parts })
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  // A partir de aquí se requiere usuario autenticado
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // ---------- UPDATE (PATCH) ----------
  if (req.method === 'PATCH') {
    try {
      const body = (req.body || {}) as any

      // Actualizar campos de la invitación
      const fields: Record<string, any> = {}
      if (body.title !== undefined) fields.title = body.title
      if (body.intro_message !== undefined) fields.intro_message = body.intro_message
      if (body.theme !== undefined) fields.theme = body.theme
      if (body.hero_image_url !== undefined) fields.hero_image_url = body.hero_image_url

      if (Object.keys(fields).length) {
        const { error: upErr } = await supa
          .from('invitations')
          .update(fields)
          .eq('id', id)
          .eq('user_id', userId)

        if (upErr) return res.status(400).json({ error: upErr.message })
      }

      // Reemplazar parts si vienen en body
      if (Array.isArray(body.parts)) {
        // Borrado anterior
        const { error: delErr } = await supa
          .from('invitation_parts')
          .delete()
          .eq('invitation_id', id)

        if (delErr) return res.status(400).json({ error: delErr.message })

        // Inserción nueva con "order" garantizado por índice
        const partsToInsert = body.parts.map((p: any, idx: number) => ({
          type: p.type ?? null,
          date: p.date ?? null,
          time: p.time ?? null,
          place: p.place ?? null,
          notes: p.notes ?? null,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          sort_order: p.sort_order ?? 0, // si existe en tu esquema
          order: Number.isInteger(p.order) ? p.order : idx, // Asegura "order"
          invitation_id: id
        }))

        const { error: insErr } = await supa
          .from('invitation_parts')
          .insert(partsToInsert)

        if (insErr) return res.status(400).json({ error: insErr.message })
      }

      // Responder recurso actualizado
      const { data, error: readErr } = await supa
        .from('invitations')
        .select('*, parts:invitation_parts(*)')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (readErr) return res.status(400).json({ error: readErr.message })

      const parts = (data?.parts ?? []).sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      return res.status(200).json({ ...data, parts })
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  // ---------- DELETE ----------
  if (req.method === 'DELETE') {
    try {
      const { error } = await supa.from('invitations').delete().eq('id', id).eq('user_id', userId)
      if (error) return res.status(400).json({ error: error.message })
      return res.status(204).send('')
    } catch (err: any) {
      return res.status(500).json({ error: String(err?.message || err) })
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' })
}
