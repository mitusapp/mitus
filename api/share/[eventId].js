// api/share/[eventId].js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://mitusapp.com';

// pequeño escape para HTML
const esc = (s = '') => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export default async function handler(req, res) {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).send('Missing eventId');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Trae los datos mínimos para la tarjeta OG
    const { data: event, error } = await supabase
      .from('events')
      .select('title, date, cover_image_url, invitation_details, event_type, event_type_label')
      .eq('id', eventId)
      .single();

    if (error || !event) return res.status(404).send('Event not found');

    // Título: "Ana y Andrés – Boda"
    const hosts = Array.isArray(event?.invitation_details?.hosts) && event.invitation_details.hosts.length
      ? event.invitation_details.hosts.join(' & ')
      : (event?.title || 'Galería');

    const typeLabel = event?.event_type_label
      || ({ boda:'Nuestra Boda', quince:'Mis Quince Años', cumpleanos:'Mi Cumpleaños', corporativo:'Corporativo', babyshower:'Mi Baby Shower', aniversario:'Nuestro Aniversario' }[event?.event_type] || 'Evento');

    const dateStr = event?.date
      ? new Date(String(event.date).replace(/-/g,'/')).toLocaleDateString('es-ES',{ year:'numeric', month:'long', day:'numeric' })
      : '';

    const title = `${hosts} – ${typeLabel}`;
    const description = dateStr ? `${typeLabel} • ${dateStr}` : `${typeLabel}`;

    // Imagen OG: portada del evento o fallback
    const ogImage = event?.cover_image_url || `${PUBLIC_BASE_URL}/og-default.jpg`;

    // URL real de la galería
    const galleryUrl = `${PUBLIC_BASE_URL}/event/${eventId}/gallery`;

    // Cachea en el edge/CDN de Vercel para no “gastar” invocaciones
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.status(200).send(`<!doctype html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />

<title>${esc(title)}</title>
<link rel="canonical" href="${galleryUrl}" />

<!-- Open Graph -->
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Mitus" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${galleryUrl}" />
<meta property="og:image" content="${ogImage}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${ogImage}" />
</head>
<body>
<script>location.replace(${JSON.stringify(galleryUrl)});</script>
<p>Redirigiendo a la galería… <a href="${galleryUrl}">Ver ahora</a></p>
</body></html>`);
  } catch (e) {
    res.status(500).send('Server error');
  }
}
