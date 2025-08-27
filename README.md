# Mitus — Invitaciones (Trial → Login+Pago → Publicación)

## Variables (.env)
- VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
- SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
- PAYMENT_PROVIDER=mock (por defecto)
- ALLOWED_ORIGINS=http://localhost:4028

## Flujo
Landing → **/wizard** (trial sin login) → **/preview/:token** → **/checkout** (login + pago mock) → **/i/:slug** (pública) → **/owner-dashboard**.

## SQL
Ejecuta en Supabase:
1) `supabase/schema.sql`
2) `supabase/policies.sql`
3) `supabase/seed.sql`

## Mock de pago
`/api/checkout/mock-pay` marca `payment_status=paid` para el borrador de prueba. Cambia a Stripe cuando tengas llaves.