import { useEffect, useState } from 'react'
import { LocateFixed, RefreshCw, Search } from 'lucide-react'
import { api, qs } from '../lib/api'
import type { Resource } from '../lib/types'
import { geocode, useAsync, useGeolocation } from '../lib/hooks'
import { useToast } from '../context/Toast'
import ResourceMap from '../components/ResourceMap'
import ResourceCard from '../components/ResourceCard'
import { Button, DemoBanner, ErrorState, PageTitle, Spinner, inputCls } from '../components/ui'
export default function MapPage() {
  const toast = useToast(); const geo = useGeolocation(); const [center, setCenter] = useState<[number, number] | null>(null); const [view, setView] = useState<'map' | 'list'>('map')
  const [addr, setAddr] = useState(''); const [radius, setRadius] = useState('10'); const [origin, setOrigin] = useState<[number, number] | null>(null)
  useEffect(() => { if (geo.pos) { setOrigin(geo.pos); setCenter(geo.pos) } }, [geo.pos])
  const { data, loading, error, reload } = useAsync(() => api.get<{ items: Resource[] }>('/resources' + qs({ lat: origin?.[0], lng: origin?.[1], radius_km: origin ? radius : '', sort: origin ? 'distance' : '', page_size: 50 })), [origin, radius])
  // Availability changes by polling every 30s. This is NOT live GPS tracking of owners or resources.
  useEffect(() => { const t = setInterval(() => reload(true), 30000); return () => clearInterval(t) }, [reload])
  const items = data?.items ?? []
  const start: [number, number] = center ?? (items[0] ? [Number(items[0].latitude), Number(items[0].longitude)] : [18.5204, 73.8567])
  const search = async () => { if (!addr.trim()) return; const g = await geocode(addr); if (!g) return toast('Could not find that location. Try a more specific address.', 'error'); setOrigin([g.lat, g.lng]); setCenter([g.lat, g.lng]) }
  return (
    <div><PageTitle title="Nearby resources" sub="Marker colour = availability · square = parking · letter = category" action={<div className="flex gap-2"><Button variant={view === 'map' ? 'primary' : 'outline'} onClick={() => setView('map')}>Map</Button><Button variant={view === 'list' ? 'primary' : 'outline'} onClick={() => setView('list')}>List</Button></div>} />
      {items.some((r) => r.is_demo) && <DemoBanner text="Some listings are demo data with approximate locations." />}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className={`${inputCls} max-w-xs`} placeholder="Search an address or area" value={addr} onChange={(e) => setAddr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} aria-label="Location search" />
        <Button variant="outline" onClick={search}><Search size={14} />Search</Button>
        <Button variant="outline" onClick={geo.request} busy={geo.busy}><LocateFixed size={14} />Use my location</Button>
        <select className={`${inputCls} max-w-[150px]`} value={radius} onChange={(e) => setRadius(e.target.value)} aria-label="Radius"><option value="2">2 km</option><option value="5">5 km</option><option value="10">10 km</option><option value="25">25 km</option></select>
        <Button variant="ghost" onClick={() => reload()}><RefreshCw size={14} />Refresh</Button>
      </div>
      {loading && !data ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : view === 'map'
        ? <ResourceMap resources={items} center={start} zoom={origin ? 13 : 11} height={520} user={origin} radiusKm={origin ? Number(radius) : undefined} />
        : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map((r) => <ResourceCard key={r.id} r={r} />)}</div>}
      {!loading && !items.length && !error && <p className="mt-3 text-sm text-slate-500">No resources in this area.</p>}
    </div>)
}
