import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { api, qs } from '../lib/api'
import type { Category, Resource } from '../lib/types'
import { useAsync, useGeolocation } from '../lib/hooks'
import ResourceCard from '../components/ResourceCard'
import { Badge, Button, Card, Empty, ErrorState, Field, PageTitle, Spinner, inputCls } from '../components/ui'
import { toIso } from '../lib/format'
interface Resp { engine: string; ai_configured: boolean; ai_used: boolean; has_location: boolean; items: { resource: Resource; score: number; reasons: string[] }[] }
export default function Recommendations() {
  const geo = useGeolocation(); const cats = useAsync(() => api.get<{ items: Category[] }>('/categories'), [])
  const [f, setF] = useState({ q: '', category_id: '', max_price: '', date: '', start: '', end: '' }); const [applied, setApplied] = useState(f)
  const { data, loading, error, reload } = useAsync(() => api.get<Resp>('/analytics/recommendations' + qs({ q: applied.q, category_id: applied.category_id, max_price: applied.max_price, lat: geo.pos?.[0], lng: geo.pos?.[1],
    start_at: applied.date && applied.start && applied.end ? toIso(applied.date, applied.start) : '', end_at: applied.date && applied.start && applied.end ? toIso(applied.date, applied.end) : '' })), [applied, geo.pos])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  return (
    <div><PageTitle title="Recommended for you" sub="Ranked from real listings using a transparent scoring engine" />
      <Card className="mb-5 grid gap-3 md:grid-cols-4">
        <div className="md:col-span-2"><Field label="What are you looking for?"><input className={inputCls} placeholder="e.g. cheap EV charger near me" value={f.q} onChange={set('q')} /></Field></div>
        <Field label="Category"><select className={inputCls} value={f.category_id} onChange={set('category_id')}><option value="">Any</option>{cats.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Max ₹/hr"><input className={inputCls} type="number" min="0" value={f.max_price} onChange={set('max_price')} /></Field>
        <Field label="Date"><input className={inputCls} type="date" value={f.date} onChange={set('date')} /></Field><Field label="From"><input className={inputCls} type="time" value={f.start} onChange={set('start')} /></Field><Field label="To"><input className={inputCls} type="time" value={f.end} onChange={set('end')} /></Field>
        <div className="flex items-end gap-2"><Button onClick={() => setApplied(f)}><Sparkles size={14} />Recommend</Button><Button variant="outline" onClick={geo.request} busy={geo.busy}>{geo.pos ? 'Location on' : 'Use location'}</Button></div></Card>
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !data?.items.length ? <Empty text="No matching resources yet. Try loosening your filters." /> : <>
        <p className="mb-3 text-sm text-slate-500">Engine: <Badge tone="Completed">{data.engine}</Badge> {!data.ai_configured && 'No AI provider configured — local rules only.'} {!data.has_location && 'Share your location to rank by distance.'}</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map(({ resource, score, reasons }) => (
          <div key={resource.id} className="space-y-2"><ResourceCard r={resource} /><Card className="text-sm"><p className="mb-1 font-medium">Why this? <span className="font-normal text-slate-400">(score {score})</span></p>{reasons.length ? <ul className="list-disc pl-5 text-slate-600">{reasons.map((r) => <li key={r}>{r}</li>)}</ul> : <p className="text-slate-500">Available now.</p>}</Card></div>))}</div></>}
    </div>)
}
