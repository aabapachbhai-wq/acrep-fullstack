import { api } from '../lib/api'
import type { Booking } from '../lib/types'
import { useAsync } from '../lib/hooks'
import { useToast } from '../context/Toast'
import { dt, inr } from '../lib/format'
import { Badge, Button, Card, Empty, ErrorState, PageTitle, Spinner, StatCard } from '../components/ui'
export default function OwnerBookings() {
  const toast = useToast(); const { data, loading, error, reload } = useAsync(() => api.get<{ items: Booking[]; summary: { earned: number; upcoming: number; pending: number } }>('/bookings/owner'), [])
  const act = async (b: Booking, path: string, body?: unknown, msg = 'Updated') => { try { await api.put(`/bookings/${b.id}/${path}`, body); toast(msg, 'success'); reload(true) } catch (e) { toast((e as Error).message, 'error') } }
  if (loading) return <Spinner />; if (error || !data) return <ErrorState text={error ?? 'Error'} retry={reload} />
  const pending = data.items.filter((b) => b.status === 'Pending'), upcoming = data.items.filter((b) => b.status === 'Approved'), history = data.items.filter((b) => !['Pending', 'Approved'].includes(b.status))
  const row = (b: Booking, actions?: React.ReactNode) => <Card key={b.id} className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">#{b.id} · {b.resource_name}</p><p className="text-sm text-slate-500">{b.borrower_name} · {dt(b.start_at)} → {dt(b.end_at)} · {inr(b.total_amount)}</p><div className="mt-1 flex gap-1.5"><Badge>{b.status}</Badge>{b.payment_status && <Badge tone={b.payment_status}>{`Payment: ${b.payment_status}`}</Badge>}</div></div><div className="flex gap-2">{actions}</div></Card>
  const sec = (t: string, l: Booking[], a?: (b: Booking) => React.ReactNode) => <section className="mb-6"><h2 className="mb-2 font-semibold">{t}</h2>{l.length ? <div className="space-y-3">{l.map((b) => row(b, a?.(b)))}</div> : <Empty text="Nothing here." />}</section>
  return (
    <div><PageTitle title="Booking requests" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3"><StatCard label="Pending requests" value={data.summary.pending} /><StatCard label="Earned (completed)" value={inr(data.summary.earned)} /><StatCard label="Upcoming (approved, estimated)" value={inr(data.summary.upcoming)} /></div>
      {sec('Incoming requests', pending, (b) => <><Button onClick={() => act(b, 'status', { status: 'Approved' }, 'Booking approved')}>Approve</Button><Button variant="outline" onClick={() => act(b, 'status', { status: 'Rejected' }, 'Booking rejected')}>Reject</Button></>)}
      {sec('Upcoming', upcoming, (b) => <Button variant="outline" disabled={new Date(b.start_at) > new Date()} title={new Date(b.start_at) > new Date() ? 'Available once the booking has started' : ''} onClick={() => act(b, 'complete', undefined, 'Marked completed')}>Mark completed</Button>)}
      {sec('History', history)}
    </div>)
}
