import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Resource } from '../lib/types'
import { useAsync } from '../lib/hooks'
import { useToast } from '../context/Toast'
import { inr } from '../lib/format'
import { Badge, Button, Card, Confirm, Empty, ErrorState, PageTitle, Spinner, inputCls } from '../components/ui'
export default function MyResources() {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => api.get<{ items: Resource[] }>('/resources/mine'), []); const [del, setDel] = useState<Resource | null>(null)
  const setAvail = async (r: Resource, s: string) => { try { await api.put(`/resources/${r.id}/availability`, { availability_status: s }); toast('Availability updated', 'success'); reload(true) } catch (e) { toast((e as Error).message, 'error') } }
  const remove = async () => { if (!del) return; try { await api.del(`/resources/${del.id}`); toast('Resource deleted', 'success'); setDel(null); reload(true) } catch (e) { toast((e as Error).message, 'error'); setDel(null) } }
  return (
    <div><PageTitle title="My resources" action={<Link to="/resources/new" className="rounded-lg bg-teal-700 px-3.5 py-2 text-sm text-white">Add resource</Link>} />
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !data?.items.length ? <Empty text="You haven't listed anything yet." action={<Link className="text-teal-700" to="/resources/new">Add your first resource</Link>} /> :
        <div className="space-y-3">{data.items.map((r) => (
          <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
            <div><Link to={`/resources/${r.id}`} className="font-semibold hover:underline">{r.name}</Link><p className="text-sm text-slate-500">{r.category} · {inr(r.price_per_hour)}/hr · {r.review_count > 0 ? `${r.avg_rating}★ (${r.review_count})` : 'no reviews'} · {r.booking_count} bookings{!!r.pending_count && <> · <Badge tone="Pending">{r.pending_count} pending</Badge></>}</p></div>
            <div className="flex items-center gap-2"><select aria-label="Availability" className={`${inputCls} w-36`} value={r.availability_status} onChange={(e) => setAvail(r, e.target.value)}><option>Available</option><option>Booked</option><option>Unavailable</option></select>
              <Link to={`/resources/${r.id}/edit`} className="rounded-lg border px-3 py-2 text-sm">Edit</Link><Button variant="danger" onClick={() => setDel(r)}>Delete</Button></div></Card>))}</div>}
      <Confirm open={!!del} title="Delete resource?" message={`“${del?.name}” and its history will be permanently removed.`} onConfirm={remove} onCancel={() => setDel(null)} />
    </div>)
}
