import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

/** --- CORS helpers --- */
function allowCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleOptions(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    allowCors(res);
    res.status(200).end();
    return true;
  }
  return false;
}

/** --- Supabase service client (Server-side) --- */
function getServiceClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing Supabase env vars', {
      hasUrl: !!url,
      hasServiceRole: !!serviceKey,
    });
    throw new Error('Server configuration error (Supabase env missing)');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (handleOptions(req, res)) return;
    allowCors(res);

    if (req.method !== 'POST') {
      return res.status(405).send('Method Not Allowed');
    }

    const svc = getServiceClient();

    const id = randomUUID();
    const token = randomUUID();
    const body = (req.body as any) || {};

    const insert = {
      id,
      user_id: null,
      title: body.title || 'Mi Evento',
      event_type: body.event_type || 'wedding',
      language: body.language || 'es',
      status: 'draft',
      theme: body.theme || 'classic',
      is_trial: true,
      trial_token: token,
      trial_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // +3 días
      payment_status: 'unpaid',
    };

    const { error } = await svc.from('invitations').insert(insert);

    if (error) {
      console.error('Insert invitations error:', error);
      return res.status(400).send(error.message);
    }

    return res.status(201).json({ id, trial_token: token });
  } catch (e: any) {
    console.error('trial/start failed:', e?.message, e);
    return res.status(500).json({
      error: 'FUNCTION_INVOCATION_FAILED',
      details: e?.message ?? String(e),
    });
  }
}
