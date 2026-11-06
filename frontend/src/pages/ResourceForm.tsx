import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import type { Category, Resource } from '../lib/types'
import { geocode, useAsync } from '../lib/hooks'
import { useToast } from '../context/Toast'
import ResourceMap from '../components/ResourceMap'
import { Button, Card, ErrorState, Field, PageTitle, Spinner, inputCls } from '../components/ui'
const blank = { name: '', category_id: '', description: '', price_per_hour: '', address: '', latitude: '', longitude: '', availability_status: 'Available', image_url: '' }
export default function ResourceForm() {
  const { id } = useParams(); const nav = useNavigate(); const toast = useToast(); const edit = !!id
  const cats = useAsync(() => api.get<{ items: Category[] }>('/categories'), [])
  const [f, setF] = useState<Record<string, string>>(blank); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false)
  const existing = useAsync(() => (edit ? api.get<{ item: Resource }>(`/resources/${id}`) : Promise.resolve(null)), [id])
  useEffect(() => { const r = existing.data?.item; if (r) setF({ name: r.name, category_id: String(r.category_id), description: r.description, price_per_hour: String(r.price_per_hour), address: r.address, latitude: String(r.latitude), longitude: String(r.longitude), availability_status: r.availability_status, image_url: r.image_url ?? '' }) }, [existing.data])
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const find = async () => { const g = await geocode(f.address); if (!g) return toast('Could not geocode that address. Click the map to place the marker instead.', 'error'); setF({ ...f, latitude: g.lat.toFixed(6), longitude: g.lng.toFixed(6) }); toast('Location found — adjust the marker if needed', 'success') }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {}
    if (f.name.trim().length < 3) er.name = 'At least 3 characters'; if (!f.category_id) er.category_id = 'Choose a category'; if (f.description.trim().length < 10) er.description = 'At least 10 characters'
    if (!(Number(f.price_per_hour) > 0)) er.price_per_hour = 'Enter a price above 0'; if (f.address.trim().length < 5) er.address = 'Enter the address'
    if (!f.latitude || Math.abs(Number(f.latitude)) > 90) er.latitude = 'Valid latitude required'; if (!f.longitude || Math.abs(Number(f.longitude)) > 180) er.longitude = 'Valid longitude required'
    if (f.image_url && !/^https?:\/\//.test(f.image_url)) er.image_url = 'Must start with http(s)://'
    setErrs(er); if (Object.keys(er).length) return
    setBusy(true)
    try { if (edit) await api.put(`/resources/${id}`, f); else await api.post('/resources', f); toast(edit ? 'Resource updated' : 'Resource added', 'success'); nav('/my-resources') }
    catch (x) { if (x instanceof ApiError && x.details) setErrs(x.details); toast((x as Error).message, 'error') } finally { setBusy(false) }
  }
  if (existing.loading || cats.loading) return <Spinner />
  if (existing.error) return <ErrorState text={existing.error} />
  const pin: [number, number] | null = f.latitude && f.longitude && !isNaN(+f.latitude) && !isNaN(+f.longitude) ? [+f.latitude, +f.longitude] : null
  return (
    <div><PageTitle title={edit ? 'Edit resource' : 'Add a resource'} />
      <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-2"><Card className="space-y-3">
        <Field label="Resource name" error={errs.name}><input className={inputCls} value={f.name} onChange={set('name')} /></Field>
        <div className="grid grid-cols-2 gap-3"><Field label="Category" error={errs.category_id}><select className={inputCls} value={f.category_id} onChange={set('category_id')}><option value="">Select…</option>{cats.data?.items.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Price per hour (₹)" error={errs.price_per_hour}><input className={inputCls} type="number" min="1" value={f.price_per_hour} onChange={set('price_per_hour')} /></Field></div>
        <Field label="Description" error={errs.description}><textarea className={inputCls} rows={4} value={f.description} onChange={set('description')} /></Field>
        <Field label="Availability"><select className={inputCls} value={f.availability_status} onChange={set('availability_status')}><option>Available</option><option>Booked</option><option>Unavailable</option></select></Field>
        <Field label="Image URL (optional)" error={errs.image_url}><input className={inputCls} value={f.image_url} onChange={set('image_url')} placeholder="https://…" /></Field>
        <div className="flex gap-2"><Button busy={busy}>{edit ? 'Save changes' : 'Add resource'}</Button><Button type="button" variant="outline" onClick={() => nav(-1)}>Cancel</Button></div></Card>
        <Card className="space-y-3"><Field label="Resource address" error={errs.address}><div className="flex gap-2"><input className={inputCls} value={f.address} onChange={set('address')} /><Button type="button" variant="outline" onClick={find}>Find on map</Button></div></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Latitude" error={errs.latitude}><input className={inputCls} value={f.latitude} onChange={set('latitude')} /></Field><Field label="Longitude" error={errs.longitude}><input className={inputCls} value={f.longitude} onChange={set('longitude')} /></Field></div>
          <p className="text-xs text-slate-500">Click the map to place the marker manually, or use “Find on map”. Coordinates are never guessed.</p>
          <ResourceMap resources={[]} center={pin ?? [18.5204, 73.8567]} zoom={pin ? 15 : 11} height={300} pin={pin} onPick={(la, lo) => setF({ ...f, latitude: la.toFixed(6), longitude: lo.toFixed(6) })} /></Card>
      </form></div>)
}
