const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const KEY = 'acrep_token'
export const tokenStore = { get: () => sessionStorage.getItem(KEY), set: (t: string) => sessionStorage.setItem(KEY, t), clear: () => sessionStorage.removeItem(KEY) }
export class ApiError extends Error {
  status: number; details?: Record<string, string>
  constructor(m: string, status: number, details?: Record<string, string>) { super(m); this.status = status; this.details = details }
}
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    const t = tokenStore.get()
    res = await fetch(`${BASE}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch { throw new ApiError('Cannot reach the ACREP server. Check that the backend is running and VITE_API_URL is correct.', 0) }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('acrep:unauthorized'))
    throw new ApiError(data?.error?.message || `Request failed (${res.status})`, res.status, data?.error?.details)
  }
  return data as T
}
export const api = {
  get: <T,>(p: string) => req<T>('GET', p), post: <T,>(p: string, b?: unknown) => req<T>('POST', p, b ?? {}),
  put: <T,>(p: string, b?: unknown) => req<T>('PUT', p, b ?? {}), del: <T,>(p: string) => req<T>('DELETE', p),
}
export const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString(); return s ? `?${s}` : ''
}
