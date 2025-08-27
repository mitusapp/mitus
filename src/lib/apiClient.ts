// src/lib/apiClient.ts
export class ApiError extends Error {
  status: number
  body?: any
  constructor(message: string, status: number, body?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function api(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
  headers.set('Accept', headers.get('Accept') || 'application/json')

  // Auth (Supabase session)
  const token = localStorage.getItem('sb-access-token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  // Trial token
  const trial = localStorage.getItem('trial_token')
  if (trial) headers.set('X-Trial-Token', trial)

  // Auto-serializa el body si es un objeto y vamos con JSON
  let body = options.body as any
  const isJson = (headers.get('Content-Type') || '').includes('application/json')
  if (body && isJson && typeof body === 'object') {
    body = JSON.stringify(body)
  }

  const res = await fetch(path, { ...options, headers, body })

  // Manejo de errores con mensaje útil
  if (!res.ok) {
    const ct = res.headers.get('content-type') || ''
    if (ct.includes('application/json')) {
      const data = await res.json().catch(() => ({}))
      const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`
      throw new ApiError(msg, res.status, data)
    } else {
      const text = await res.text().catch(() => '')
      const msg = text || `HTTP ${res.status}`
      throw new ApiError(msg, res.status, text)
    }
  }

  // Respuesta OK
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export function setAccessToken(token: string | null) {
  if (token) localStorage.setItem('sb-access-token', token)
  else localStorage.removeItem('sb-access-token')
}
