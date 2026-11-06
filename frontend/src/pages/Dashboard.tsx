import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import type { Notification, Resource } from '../lib/types'
import { useAuth } from '../context/Auth'
import { useAsync, useGeolocation } from '../lib/hooks'
import { dt } from '../lib/format'
import ResourceMap from '../components/ResourceMap'
import ResourceCard from '../components/ResourceCard'
import { Button, Card, ErrorState, PageTitle, Spinner, StatCard } from '../components/ui'
import { haversine } from '../lib/geo'
interface D { metrics: { listed: number; available: number; activeBookings: number; pendingRequests: number }; byCategory: { name: string; count: number }[]; activity: { ym: string; count: number }[]; recent: Notification[]; latest: Resource[] }
export default function Dashboard() {
  const { user } = useAuth(); const geo = useGeolocation(); const { data, loading, error, reload } = useAsync(() => api.get<D>('/analytics/dashboard'), [])
  const rec = useAsync(() => api.get<{ items: { resource: Resource; reasons: string[] }[] }>('/analytics/recommendations'), []); const [, force] = useState(0)
  if (loading) return <Spinner />; if (error || !data) return <ErrorState text={error ?? 'Error'} retry={reload} />
  const m = data.metrics
  const nearby = geo.pos ? [...data.latest].map((r) => ({ ...r, distance_km: haversine(geo.pos![0], geo.pos![1], Number(r.latitude), Number(r.longitude)) })).sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0)).slice(0, 3) : data.latest.slice(0, 3)
  const c: [number, number] = geo.pos ?? (data.latest[0] ? [Number(data.latest[0].latitude), Number(data.latest[0].longitude)] : [18.5204, 73.8567])
  return (
    <div><PageTitle title={`Welcome, ${user?.full_name.split(' ')[0]}`} sub="Everything here is calculated from your stored data" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Resources listed" value={m.listed} /><StatCard label="Available now" value={m.available} /><StatCard label="Active bookings" value={m.activeBookings} /><StatCard label="Pending requests" value={m.pendingRequests} /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card><h2 className="mb-3 text-sm font-semibold">Resources by category (platform)</h2><div className="h-52"><ResponsiveContainer><BarChart data={data.byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0f766e" /></BarChart></ResponsiveContainer></div></Card>
        <Card><h2 className="mb-3 text-sm font-semibold">Your booking activity (6 months)</h2>{data.activity.length ? <div className="h-52"><ResponsiveContainer><BarChart data={data.activity}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="ym" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#14b8a6" /></BarChart></ResponsiveContainer></div> : <p className="py-16 text-center text-sm text-slate-500">No bookings in the last 6 months.</p>}</Card>
        <Card><div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Map preview</h2><Button variant="outline" onClick={() => { geo.request(); force((n) => n + 1) }} busy={geo.busy}>Use my location</Button></div><ResourceMap resources={data.latest} center={c} zoom={11} height={240} user={geo.pos} /></Card>
        <Card><h2 className="mb-2 text-sm font-semibold">Recent activity</h2>{data.recent.length ? data.recent.map((n) => <div key={n.id} className="border-t py-2 text-sm"><p className={n.is_read ? '' : 'font-medium'}>{n.message}</p><p className="text-xs text-slate-500">{dt(n.created_at)}</p></div>) : <p className="text-sm text-slate-500">No activity yet.</p>}<Link to="/notifications" className="text-sm text-teal-700">All notifications</Link></Card>
      </div>
      <h2 className="mb-3 mt-6 font-semibold">{geo.pos ? 'Nearest listings' : 'Latest listings'}</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{nearby.map((r) => <ResourceCard key={r.id} r={r} />)}</div>
      <div className="mb-3 mt-6 flex justify-between"><h2 className="font-semibold">Recommended for you</h2><Link to="/recommendations" className="text-sm text-teal-700">See all</Link></div>
      {rec.data?.items.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rec.data.items.slice(0, 3).map((x) => <div key={x.resource.id}><ResourceCard r={x.resource} /><p className="mt-1 text-xs text-slate-500">{x.reasons[0] ?? 'Available now'}</p></div>)}</div> : <p className="text-sm text-slate-500">No recommendations yet.</p>}
    </div>)
}
