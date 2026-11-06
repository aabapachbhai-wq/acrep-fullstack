import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Booking } from '../lib/types'
import { useAsync } from '../lib/hooks'
import { useToast } from '../context/Toast'
import { dt, inr } from '../lib/format'
import { Badge, Button, Card, ErrorState, PageTitle, Spinner } from '../components/ui'
export default function Checkout() {
  const { id } = useParams(); const toast = useToast(); const { data, loading, error, reload } = useAsync(() => api.get<{ item: Booking }>(`/bookings/${id}`), [id])
  const [method, setMethod] = useState('UPI'); const [busy, setBusy] = useState(false); const [receipt, setReceipt] = useState<{ status: string; reference: string; amount: number; method: string } | null>(null)
  if (loading) return <Spinner />; if (error || !data) return <ErrorState text={error ?? 'Not found'} retry={reload} />
  const b = data.item; const canPay = ['Approved', 'Completed'].includes(b.status) && !b.payment_status && !receipt
  const pay = async () => { setBusy(true); try { const d = await api.post<{ item: typeof receipt }>('/payments', { booking_id: b.id, method }); setReceipt(d.item); toast('Simulated payment recorded', 'success'); reload(true) } catch (e) { toast((e as Error).message, 'error') } finally { setBusy(false) } }
  return (
    <div className="mx-auto max-w-xl"><PageTitle title={`Booking #${b.id}`} />
      <Card className="space-y-2 text-sm"><div className="flex justify-between"><b>{b.resource_name}</b><Badge>{b.status}</Badge></div>
        <p>{dt(b.start_at)} → {dt(b.end_at)} ({b.duration_hours} h)</p><p>Owner: {b.owner_name}</p><p className="text-lg font-semibold">{inr(b.total_amount)}</p>
        {b.status === 'Pending' && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Request sent. You'll be notified when the owner approves or rejects it; payment opens after approval.</p>}
        {(b.payment_status || receipt) && <p className="rounded-lg bg-teal-50 p-3 text-teal-800">Payment status: {receipt?.status ?? b.payment_status} {receipt && `· ref ${receipt.reference}`} (simulated)</p>}</Card>
      {canPay && <Card className="mt-4 space-y-3"><div className="rounded-lg bg-violet-50 p-3 text-xs text-violet-800">Simulated payment — no real money moves and no card details are collected.</div>
        <div className="grid grid-cols-2 gap-2">{['UPI', 'Card', 'Cash', 'NetBanking'].map((m) => <label key={m} className={`cursor-pointer rounded-lg border p-3 text-center text-sm ${method === m ? 'border-teal-700 bg-teal-50' : ''}`}><input type="radio" name="m" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />{m}</label>)}</div>
        <Button className="w-full" onClick={pay} busy={busy}>Pay {inr(b.total_amount)} (simulated)</Button></Card>}
      <div className="mt-4 flex gap-3 text-sm"><Link to="/bookings" className="text-teal-700">My bookings</Link><Link to="/payments" className="text-teal-700">Payment history</Link></div></div>)
}
