import { useCallback, useEffect, useState } from 'react'
import { api } from './api'
import { useAuth } from '../context/Auth'
import { useToast } from '../context/Toast'
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback((silent = false) => { if (!silent) setLoading(true); setError(null); fn().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false)) }, deps)
  useEffect(() => { run() }, [run])
  return { data, error, loading, reload: run }
}
export function useFavourites() {
  const { user } = useAuth(); const toast = useToast(); const [ids, setIds] = useState<Set<number>>(new Set())
  useEffect(() => { if (user) api.get<{ ids: number[] }>('/favourites/ids').then((d) => setIds(new Set(d.ids))).catch(() => {}); else setIds(new Set()) }, [user])
  const toggle = async (id: number) => {
    if (!user) { toast('Log in to save favourites', 'info'); return }
    const on = ids.has(id)
    try { if (on) await api.del(`/favourites/${id}`); else await api.post(`/favourites/${id}`); setIds((s) => { const n = new Set(s); if (on) n.delete(id); else n.add(id); return n }) }
    catch (e) { toast((e as Error).message, 'error') }
  }
  return { ids, toggle }
}
// Location is requested only when the user clicks the button; denial is handled gracefully.
export function useGeolocation() {
  const toast = useToast(); const [pos, setPos] = useState<[number, number] | null>(null); const [busy, setBusy] = useState(false)
  const request = () => {
    if (!navigator.geolocation) { toast('Geolocation is not supported by this browser', 'error'); return }
    setBusy(true)
    navigator.geolocation.getCurrentPosition((p) => { setPos([p.coords.latitude, p.coords.longitude]); setBusy(false) },
      (err) => { setBusy(false); toast(err.code === 1 ? 'Location permission denied. You can still search by address.' : 'Could not determine your location', 'error') }, { timeout: 10000 })
  }
  return { pos, setPos, request, busy }
}
// OpenStreetMap Nominatim (free, rate-limited: fine for demos, not for heavy production use).
export async function geocode(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`)
    const d = await r.json(); return d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon), label: d[0].display_name } : null
  } catch { return null }
}
