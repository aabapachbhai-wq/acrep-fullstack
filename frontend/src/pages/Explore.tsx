import { useEffect, useState } from 'react'
import { api, qs } from '../lib/api'
import type { Category, Resource } from '../lib/types'
import { useAsync, useFavourites, useGeolocation } from '../lib/hooks'
import ResourceCard from '../components/ResourceCard'
import { Button, Card, Empty, ErrorState, PageTitle, Spinner, inputCls } from '../components/ui'
import { LocateFixed } from 'lucide-react'
export default function Explore() {
  const [f, setF] = useState({ q: '', category_id: '', min_price: '', max_price: '', availability: '', location: '', sort: 'relevance', radius_km: '' }); const [dq, setDq] = useState(f.q); const [page, setPage] = useState(1)
  const geo = useGeolocation(); const fav = useFavourites()
  useEffect(() => { const t = setTimeout(() => setDq(f.q), 300); return () => clearTimeout(t) }, [f.q])
  const cats = useAsync(() => api.get<{ items: Category[] }>('/categories'), [])
  const { data, loading, error, reload } = useAsync(() => api.get<{ items: Resource[]; total: number; page_size: number }>('/resources' + qs({ ...f, q: dq, lat: geo.pos?.[0], lng: geo.pos?.[1], page })), [dq, f.category_id, f.min_price, f.max_price, f.availability, f.location, f.sort, f.radius_km, geo.pos, page])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setPage(1); setF({ ...f, [k]: e.target.value }) }
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  return (
    <div><PageTitle title="Explore resources" sub={data ? `${data.total} found` : undefined} />
      <Card className="mb-5 grid gap-3 md:grid-cols-4">
        <input className={`${inputCls} md:col-span-2`} placeholder="Search name or description…" aria-label="Search" value={f.q} onChange={set('q')} />
        <select className={inputCls} aria-label="Category" value={f.category_id} onChange={set('category_id')}><option value="">All categories</option>{cats.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={inputCls} aria-label="Availability" value={f.availability} onChange={set('availability')}><option value="">Any availability</option><option>Available</option><option>Booked</option><option>Unavailable</option></select>
        <input className={inputCls} type="number" min="0" placeholder="Min ₹/hr" value={f.min_price} onChange={set('min_price')} />
        <input className={inputCls} type="number" min="0" placeholder="Max ₹/hr" value={f.max_price} onChange={set('max_price')} />
        <input className={inputCls} placeholder="Area / address contains…" value={f.location} onChange={set('location')} />
        <select className={inputCls} aria-label="Sort" value={f.sort} onChange={set('sort')}><option value="relevance">Sort: relevance</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="distance" disabled={!geo.pos}>Distance (needs location)</option></select>
        <div className="flex gap-2 md:col-span-4"><Button variant="outline" onClick={geo.request} busy={geo.busy}><LocateFixed size={14} />{geo.pos ? 'Location on' : 'Use my location'}</Button>
          {geo.pos && <select className={`${inputCls} max-w-[180px]`} aria-label="Distance filter" value={f.radius_km} onChange={set('radius_km')}><option value="">Any distance</option><option value="2">Within 2 km</option><option value="5">Within 5 km</option><option value="10">Within 10 km</option><option value="25">Within 25 km</option></select>}</div>
      </Card>
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !data?.items.length ? <Empty text="No resources match your filters." /> : <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((r) => <ResourceCard key={r.id} r={r} fav={fav.ids.has(r.id)} onFav={fav.toggle} />)}</div>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>Page {page} of {pages}<Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div></>}
    </div>)
}
