import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Booking } from '../lib/types'
import { useAsync } from '../lib/hooks'
import { useToast } from '../context/Toast'
import { dt, inr } from '../lib/format'
import { Badge, Button, Card, Confirm, Empty, ErrorState, Field, Modal, PageTitle, Spinner, inputCls } from '../components/ui'
export default function MyBookings() {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => api.get<{ items: Booking[] }>('/bookings/my'), [])
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming'); const [cancel, setCancel] = useState<Booking | null>(null); const [rev, setRev] = useState<Booking | null>(null); const [rv, setRv] = useState({ rating: 5, comment: '' })
  const now = Date.now(); const list = (data?.items ?? []).filter((b) => { const up = new Date(b.end_at).getTime() > now && ['Pending', 'Approved'].includes(b.status); return tab === 'upcoming' ? up : !up })
  const doCancel = async () => { if (!cancel) return; try { await api.put(`/bookings/${cancel.id}/cancel`); toast('Booking cancelled', 'success'); reload(true) } catch (e) { toast((e as Error).message, 'error') } setCancel(null) }
  const submit = async () => { if (!rev) return; try { await api.post('/reviews', { booking_id: rev.id, ...rv }); toast('Review submitted', 'success'); setRev(null); setRv({ rating: 5, comment: '' }); reload(true) } catch (e) { toast((e as Error).message, 'error') } }
  return (
    <div><PageTitle title="My bookings" />
      <div className="mb-4 flex gap-2">{(['upcoming', 'past'] as const).map((t) => <Button key={t} variant={tab === t ? 'primary' : 'outline'} onClick={() => setTab(t)}>{t === 'upcoming' ? 'Upcoming' : 'Past'}</Button>)}</div>
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !list.length ? <Empty text={`No ${tab} bookings.`} action={<Link className="text-teal-700" to="/explore">Explore resources</Link>} /> :
        <div className="space-y-3">{list.map((b) => (
          <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="font-semibold">#{b.id} · <Link className="hover:underline" to={`/resources/${b.resource_id}`}>{b.resource_name}</Link></p><p className="text-sm text-slate-500">{dt(b.start_at)} → {dt(b.end_at)} · {inr(b.total_amount)}</p>
              <div className="mt-1 flex gap-1.5"><Badge>{b.status}</Badge>{b.payment_status && <Badge tone={b.payment_status}>{`Payment: ${b.payment_status}`}</Badge>}</div></div>
            <div className="flex gap-2">
              {['Pending', 'Approved'].includes(b.status) && <Button variant="outline" onClick={() => setCancel(b)}>Cancel</Button>}
              {['Approved', 'Completed'].includes(b.status) && !b.payment_status && <Link to={`/bookings/${b.id}/checkout`} className="rounded-lg bg-teal-700 px-3.5 py-2 text-sm text-white">Make payment</Link>}
              {b.status === 'Completed' && !b.has_review && <Button variant="outline" onClick={() => setRev(b)}>Review</Button>}</div></Card>))}</div>}
      <Confirm open={!!cancel} title="Cancel this booking?" message="Approved bookings can only be cancelled at least 2 hours before they start." onConfirm={doCancel} onCancel={() => setCancel(null)} />
      <Modal open={!!rev} title={`Review ${rev?.resource_name ?? ''}`} onClose={() => setRev(null)}><div className="space-y-3">
        <Field label="Rating"><div className="flex gap-1" role="radiogroup">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rv.rating === n} aria-label={`${n} stars`} onClick={() => setRv({ ...rv, rating: n })} className={`text-2xl ${n <= rv.rating ? 'text-amber-400' : 'text-slate-300'}`}>★</button>)}</div></Field>
        <Field label="Your review"><textarea className={inputCls} rows={3} maxLength={1000} value={rv.comment} onChange={(e) => setRv({ ...rv, comment: e.target.value })} /></Field><Button onClick={submit}>Submit review</Button></div></Modal>
    </div>)
}
