import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Flag, Heart, LocateFixed, Star } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import type { Resource } from '../lib/types'
import { useAuth } from '../context/Auth'
import { useToast } from '../context/Toast'
import { useAsync, useFavourites, useGeolocation } from '../lib/hooks'
import { dt, hoursBetween, inr, toIso } from '../lib/format'
import { haversine } from '../lib/geo'
import ResourceMap from '../components/ResourceMap'
import ResourceCard from '../components/ResourceCard'
import { Badge, Button, Card, DemoBanner, ErrorState, Field, Modal, Spinner, inputCls } from '../components/ui'
interface Rev { id: number; rating: number; comment: string; created_at: string; reviewer: string }
export default function ResourceDetail() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast(); const { user, isBorrower } = useAuth(); const fav = useFavourites(); const geo = useGeolocation()
  const res = useAsync(() => api.get<{ item: Resource }>(`/resources/${id}`), [id])
  const revs = useAsync(() => api.get<{ items: Rev[]; average: number | null; count: number }>(`/reviews/resource/${id}`), [id])
  const sim = useAsync(() => api.get<{ items: Resource[] }>(`/resources/${id}/similar`), [id])
  const [f, setF] = useState({ date: '', start: '', end: '' }); const [busy, setBusy] = useState(false); const [errs, setErrs] = useState<string>('')
  const [rep, setRep] = useState(false); const [report, setReport] = useState({ reason: 'Misleading listing', details: '' })
  const busyDay = useAsync(() => f.date ? api.get<{ items: { start_at: string; end_at: string; status: string }[] }>(`/resources/${id}/availability?from=${encodeURIComponent(new Date(`${f.date}T00:00`).toISOString())}&to=${encodeURIComponent(new Date(`${f.date}T23:59:59`).toISOString())}`) : Promise.resolve(null), [id, f.date])
  if (res.loading) return <Spinner />
  if (res.error || !res.data) return <ErrorState text={res.error ?? 'Not found'} retry={res.reload} />
  const r = res.data.item; const mine = user?.id === r.owner_id
  const hours = hoursBetween(f.date, f.start, f.end); const est = hours > 0 ? hours * Number(r.price_per_hour) : 0
  const dist = geo.pos ? haversine(geo.pos[0], geo.pos[1], Number(r.latitude), Number(r.longitude)) : null
  const book = async () => {
    setErrs(''); if (!user) return nav('/login')
    if (!f.date || !f.start || !f.end) return setErrs('Choose a date, start time and end time')
    if (hours <= 0) return setErrs('End time must be after start time')
    setBusy(true)
    try { const d = await api.post<{ item: { id: number } }>('/bookings', { resource_id: r.id, start_at: toIso(f.date, f.start), end_at: toIso(f.date, f.end) }); toast('Booking requested', 'success'); nav(`/bookings/${d.item.id}/checkout`) }
    catch (e) { setErrs((e as ApiError).message) } finally { setBusy(false) }
  }
  const sendReport = async () => { try { await api.post('/reports', { resource_id: r.id, ...report }); toast('Report submitted. Thank you.', 'success'); setRep(false) } catch (e) { toast((e as Error).message, 'error') } }
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        {!!r.is_demo && <DemoBanner text="This is a demo listing with an approximate location." />}
        {r.image_url && <img src={r.image_url} alt="" className="h-56 w-full rounded-xl object-cover" />}
        <div><div className="flex flex-wrap items-center gap-2"><Badge tone="Completed">{r.category}</Badge><Badge>{r.availability_status}</Badge></div>
          <h1 className="mt-2 text-2xl font-semibold">{r.name}</h1><p className="text-sm text-slate-500">{r.address}{dist != null && ` · ${dist.toFixed(1)} km from you`}</p>
          <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => fav.toggle(r.id)}><Heart size={14} className={fav.ids.has(r.id) ? 'fill-red-500 text-red-500' : ''} />{fav.ids.has(r.id) ? 'Saved' : 'Save'}</Button>
            <Button variant="outline" onClick={geo.request} busy={geo.busy}><LocateFixed size={14} />Distance from me</Button>
            {user && !mine && <Button variant="ghost" onClick={() => setRep(true)}><Flag size={14} />Report</Button>}</div></div>
        <Card><p className="whitespace-pre-line text-sm">{r.description}</p><p className="mt-3 text-xs text-slate-500">Listed by {r.owner_name}{r.owner_city && ` · ${r.owner_city}`}</p></Card>
        <ResourceMap resources={[r]} center={[Number(r.latitude), Number(r.longitude)]} zoom={14} height={260} user={geo.pos} />
        <Card><h2 className="mb-2 font-semibold">Reviews {revs.data?.average != null && <span className="ml-2 text-sm font-normal"><Star size={14} className="mr-1 inline fill-amber-400 text-amber-400" />{revs.data.average} ({revs.data.count})</span>}</h2>
          {!revs.data?.items.length ? <p className="text-sm text-slate-500">No reviews yet. Only borrowers with completed bookings can review.</p> : revs.data.items.map((v) => <div key={v.id} className="border-t py-2 text-sm"><b>{v.reviewer}</b> · {v.rating}/5 · <span className="text-slate-500">{dt(v.created_at)}</span>{v.comment && <p>{v.comment}</p>}</div>)}</Card>
        {!!sim.data?.items.length && <div><h2 className="mb-2 font-semibold">Similar resources</h2><div className="grid gap-4 sm:grid-cols-2">{sim.data.items.slice(0, 2).map((s) => <ResourceCard key={s.id} r={s} />)}</div></div>}
      </div>
      <Card className="h-fit space-y-3 lg:sticky lg:top-6">
        <p className="text-xl font-semibold">{inr(r.price_per_hour)}<span className="text-sm font-normal text-slate-500">/hr</span></p>
        {mine ? <Link to={`/resources/${r.id}/edit`} className="block rounded-lg border py-2 text-center text-sm">Edit this listing</Link>
          : user && !isBorrower ? <p className="text-sm text-slate-500">Switch your account type to Borrower or Both in Profile to book.</p> : <>
          <Field label="Date"><input className={inputCls} type="date" min={new Date().toISOString().slice(0, 10)} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2"><Field label="Start"><input className={inputCls} type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field><Field label="End"><input className={inputCls} type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field></div>
          {!!busyDay.data?.items.length && <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800"><p className="font-medium">Already taken on this date:</p>{busyDay.data.items.map((b, i) => <p key={i}>{dt(b.start_at)} – {new Date(b.end_at).toLocaleTimeString(undefined, { timeStyle: 'short' })} ({b.status})</p>)}</div>}
          <p className="text-sm text-slate-600">Duration: {hours > 0 ? `${hours.toFixed(2)} h` : '—'}<br />Estimated total: <b>{inr(est)}</b> <span className="text-xs">(final amount is calculated by the server)</span></p>
          {errs && <p role="alert" className="text-sm text-red-600">{errs}</p>}
          <Button className="w-full" onClick={book} busy={busy} disabled={r.availability_status !== 'Available'}>{user ? 'Book resource' : 'Log in to book'}</Button>
          {r.availability_status !== 'Available' && <p className="text-xs text-slate-500">This resource is currently {r.availability_status.toLowerCase()}.</p>}</>}
      </Card>
      <Modal open={rep} title="Report this listing" onClose={() => setRep(false)}><div className="space-y-3">
        <Field label="Reason"><select className={inputCls} value={report.reason} onChange={(e) => setReport({ ...report, reason: e.target.value })}>{['Misleading listing', 'Wrong location', 'Unsafe', 'Spam', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Details"><textarea className={inputCls} rows={3} maxLength={1000} value={report.details} onChange={(e) => setReport({ ...report, details: e.target.value })} /></Field><Button onClick={sendReport}>Submit report</Button></div></Modal>
    </div>)
}
