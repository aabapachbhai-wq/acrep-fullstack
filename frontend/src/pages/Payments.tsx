import { useState } from 'react'
import { api } from '../lib/api'
import type { Payment } from '../lib/types'
import { useAsync } from '../lib/hooks'
import { useAuth } from '../context/Auth'
import { dt, inr } from '../lib/format'
import { Badge, Button, Card, Empty, ErrorState, Modal, PageTitle, Spinner } from '../components/ui'
export default function Payments() {
  const { isOwner } = useAuth(); const [tab, setTab] = useState<'my' | 'received'>('my'); const [sel, setSel] = useState<Payment | null>(null)
  const { data, loading, error, reload } = useAsync(() => api.get<{ items: Payment[] }>(`/payments/${tab}`), [tab])
  return (
    <div><PageTitle title="Payment history" sub="All payments in this prototype are simulated" action={<div className="flex gap-2"><Button variant={tab === 'my' ? 'primary' : 'outline'} onClick={() => setTab('my')}>My payments</Button>{isOwner && <Button variant={tab === 'received' ? 'primary' : 'outline'} onClick={() => setTab('received')}>Received</Button>}</div>} />
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !data?.items.length ? <Empty text="No transactions yet." /> :
        <Card className="overflow-x-auto p-0"><table className="w-full text-sm"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Date</th><th>Resource</th><th>Method</th><th>Amount</th><th>Status</th><th /></tr></thead>
          <tbody>{data.items.map((p) => <tr key={p.id} className="border-t"><td className="p-3">{dt(p.created_at)}</td><td>{p.resource_name}{tab === 'received' && <span className="text-slate-500"> · {p.payer_name}</span>}</td><td>{p.method}</td><td>{inr(p.amount)}</td><td><Badge>{p.status}</Badge></td><td><Button variant="ghost" onClick={() => setSel(p)}>Receipt</Button></td></tr>)}</tbody></table></Card>}
      <Modal open={!!sel} title="Transaction summary" onClose={() => setSel(null)}>{sel && <div className="space-y-1 text-sm"><p className="rounded bg-violet-50 p-2 text-xs text-violet-800">Simulated transaction — not a real payment receipt.</p>
        <p>Reference: <b>{sel.reference}</b></p><p>Booking: #{sel.booking_id} · {sel.resource_name}</p><p>Method: {sel.method}</p><p>Amount: {inr(sel.amount)}</p><p>Status: {sel.status}</p><p>Date: {dt(sel.created_at)}</p></div>}</Modal>
    </div>)
}
