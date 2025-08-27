export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  const token = localStorage.getItem('sb-access-token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // add trial token if present
  const trial = localStorage.getItem('trial_token')
  if (trial) headers.set('X-Trial-Token', trial)

  const res = await fetch(path, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(()=> '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem('sb-access-token', token)
  else localStorage.removeItem('sb-access-token')
}