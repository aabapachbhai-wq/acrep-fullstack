import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { useToast } from '../context/Toast'
import { dt, inr } from '../lib/format'
import { Badge, Button, Card, ErrorState, PageTitle, Spinner, StatCard } from '../components/ui'
interface S { totals: Record<string, number>; byCategory: { name: string; resources: number; bookings: number; value: number }[]; byStatus: { status: string; count: number }[]; recentBookings: { id: number; resource_name: string; borrower_name: string; total_amount: number; status: string; start_at: string }[] }
interface U { id: number; full_name: string; email: string; city: string; account_type: string; role: string; is_active: number; is_demo: number }
interface R { id: number; name: string; category: string; owner_name: string; price_per_hour: number; is_suspended: number; open_reports: number; is_demo: number }
interface Rp { id: number; resource_id: number; resource_name: string; reporter_name: string; reason: string; details: string; status: string }
export default function Admin() {
  const toast = useToast(); const [tab, setTab] = useState<'users' | 'resources' | 'reports' | 'bookings'>('users')
  const sum = useAsync(() => api.get<S>('/admin/summary'), []); const users = useAsync(() => api.get<{ items: U[] }>('/admin/users'), []); const res = useAsync(() => api.get<{ items: R[] }>('/admin/resources'), []); const reps = useAsync(() => api.get<{ items: Rp[] }>('/admin/reports'), [])
  const run = async (fn: () => Promise<unknown>, after: () => void) => { try { await fn(); toast('Done', 'success'); after(); sum.reload(true) } catch (e) { toast((e as Error).message, 'error') } }
  if (sum.loading) return <Spinner />; if (sum.error || !sum.data) return <ErrorState text={sum.error ?? 'Error'} retry={sum.reload} />
  const t = sum.data.totals
  return (
    <div><PageTitle title="Admin dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Users" value={t.users} /><StatCard label="Resources" value={`${t.activeResources} / ${t.resources} active`} /><StatCard label="Bookings" value={t.bookings} /><StatCard label="Simulated paid total" value={inr(t.simulatedPaidTotal)} /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-sm font-semibold">Category analytics (bookings)</h2><div className="h-52"><ResponsiveContainer><BarChart data={sum.data.byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="bookings" fill="#0f766e" /><Bar dataKey="resources" fill="#99f6e4" /></BarChart></ResponsiveContainer></div></Card>
        <Card><h2 className="mb-3 text-sm font-semibold">Bookings by status</h2><div className="h-52"><ResponsiveContainer><BarChart data={sum.data.byStatus}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#14b8a6" /></BarChart></ResponsiveContainer></div></Card></div>
      <div className="my-5 flex flex-wrap gap-2">{(['users', 'resources', 'reports', 'bookings'] as const).map((k) => <Button key={k} variant={tab === k ? 'primary' : 'outline'} onClick={() => setTab(k)}>{k[0].toUpperCase() + k.slice(1)}{k === 'reports' && t.openReports ? ` (${t.openReports})` : ''}</Button>)}</div>
      <Card className="overflow-x-auto p-0 text-sm">
        {tab === 'users' && <table className="w-full"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Name</th><th>Email</th><th>Type</th><th>Status</th><th /></tr></thead><tbody>{users.data?.items.map((u) => <tr key={u.id} className="border-t"><td className="p-3">{u.full_name}</td><td>{u.email}</td><td>{u.account_type}{u.role === 'admin' && ' · admin'}</td><td><Badge tone={u.is_active ? 'Available' : 'Rejected'}>{u.is_active ? 'Active' : 'Disabled'}</Badge></td>
          <td>{u.role !== 'admin' && <Button variant="ghost" onClick={() => run(() => api.put(`/admin/users/${u.id}/status`, { is_active: u.is_active ? 0 : 1 }), () => users.reload(true))}>{u.is_active ? 'Disable' : 'Enable'}</Button>}</td></tr>)}</tbody></table>}
        {tab === 'resources' && <table className="w-full"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Resource</th><th>Owner</th><th>Open reports</th><th>Status</th><th /></tr></thead><tbody>{res.data?.items.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{r.name} <span className="text-slate-400">· {r.category}</span></td><td>{r.owner_name}</td><td>{r.open_reports}</td><td><Badge tone={r.is_suspended ? 'Rejected' : 'Available'}>{r.is_suspended ? 'Suspended' : 'Live'}</Badge></td>
          <td><Button variant="ghost" onClick={() => run(() => api.put(`/admin/resources/${r.id}/moderation`, { is_suspended: r.is_suspended ? 0 : 1 }), () => res.reload(true))}>{r.is_suspended ? 'Restore' : 'Suspend'}</Button></td></tr>)}</tbody></table>}
        {tab === 'reports' && (reps.data?.items.length ? <table className="w-full"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">Resource</th><th>Reason</th><th>Reporter</th><th>Status</th><th /></tr></thead><tbody>{reps.data.items.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{r.resource_name}<p className="text-xs text-slate-500">{r.details}</p></td><td>{r.reason}</td><td>{r.reporter_name}</td><td><Badge tone={r.status === 'Open' ? 'Pending' : 'Completed'}>{r.status}</Badge></td>
          <td>{r.status === 'Open' && <><Button variant="ghost" onClick={() => run(() => api.put(`/admin/reports/${r.id}`, { status: 'Resolved' }), () => reps.reload(true))}>Resolve</Button><Button variant="ghost" onClick={() => run(() => api.put(`/admin/reports/${r.id}`, { status: 'Dismissed' }), () => reps.reload(true))}>Dismiss</Button></>}</td></tr>)}</tbody></table> : <p className="p-6 text-center text-slate-500">No reports.</p>)}
        {tab === 'bookings' && <table className="w-full"><thead className="bg-slate-50 text-left text-slate-500"><tr><th className="p-3">#</th><th>Resource</th><th>Borrower</th><th>Start</th><th>Amount</th><th>Status</th></tr></thead><tbody>{sum.data.recentBookings.map((b) => <tr key={b.id} className="border-t"><td className="p-3">{b.id}</td><td>{b.resource_name}</td><td>{b.borrower_name}</td><td>{dt(b.start_at)}</td><td>{inr(b.total_amount)}</td><td><Badge>{b.status}</Badge></td></tr>)}</tbody></table>}
      </Card></div>)
}
