import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../lib/api'
import { useAsync } from '../lib/hooks'
import { Card, DemoBanner, ErrorState, PageTitle, Spinner } from '../components/ui'
interface D { byCategory: { name: string; bookings: number }[]; byMonth: { ym: string; bookings: number }[]; byWeekday: { dow: number; bookings: number }[]; byHour: { hr: number; bookings: number }[]
  utilization: { id: number; name: string; bookings: number; booked_hours: number }[]; forecast: { sufficient: boolean; reason?: string; method?: string; history?: number[]; forecast?: number[]; backtestMae?: number }; includesDemoData: boolean; timezoneNote: string }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const Chart = ({ title, children }: { title: string; children: React.ReactElement }) => <Card><h2 className="mb-3 text-sm font-semibold">{title}</h2><div className="h-56"><ResponsiveContainer>{children}</ResponsiveContainer></div></Card>
export default function Analytics() {
  const { data, loading, error, reload } = useAsync(() => api.get<D>('/analytics/demand'), [])
  if (loading) return <Spinner />; if (error || !data) return <ErrorState text={error ?? 'Error'} retry={reload} />
  const f = data.forecast, hist = f.history ?? []
  const series = f.sufficient ? [...hist.map((v, i) => ({ w: `-${hist.length - i}w`, actual: v })), ...(f.forecast ?? []).map((v, i) => ({ w: `+${i + 1}w`, forecast: v }))] : []
  return (
    <div><PageTitle title="Demand analytics" sub="Computed from stored bookings" />
      {data.includesDemoData && <DemoBanner text="These figures include seeded demo data. Treat them as a demonstration, not real market history." />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Chart title="Bookings by category"><BarChart data={data.byCategory}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="bookings" fill="#0f766e" /></BarChart></Chart>
        <Chart title="Bookings per month (last 12)"><LineChart data={data.byMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="ym" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="bookings" stroke="#0f766e" /></LineChart></Chart>
        <Chart title="By weekday (UTC)"><BarChart data={data.byWeekday.map((d) => ({ day: DAYS[d.dow - 1], bookings: d.bookings }))}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="bookings" fill="#14b8a6" /></BarChart></Chart>
        <Chart title="By start hour (UTC)"><BarChart data={data.byHour}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hr" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="bookings" fill="#14b8a6" /></BarChart></Chart>
      </div>
      <Card className="mt-4"><h2 className="mb-2 text-sm font-semibold">Weekly demand forecast</h2>
        {f.sufficient ? <><p className="mb-2 text-xs text-slate-500">Method: {f.method}. Backtest mean absolute error: {f.backtestMae} bookings/week. A baseline, not a prediction guarantee.</p>
          <div className="h-56"><ResponsiveContainer><LineChart data={series}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="w" fontSize={11} /><YAxis allowDecimals={false} /><Tooltip /><Line dataKey="actual" stroke="#0f766e" connectNulls /><Line dataKey="forecast" stroke="#7c3aed" strokeDasharray="5 5" /></LineChart></ResponsiveContainer></div></>
          : <p className="text-sm text-slate-600">Insufficient data for a forecast. {f.reason}</p>}</Card>
      <Card className="mt-4"><h2 className="mb-2 text-sm font-semibold">Your resources — last 30 days</h2>
        {!data.utilization.length ? <p className="text-sm text-slate-500">You have no listings.</p> : <table className="w-full text-sm"><thead className="text-left text-slate-500"><tr><th>Resource</th><th>Bookings</th><th>Booked hours</th></tr></thead><tbody>{data.utilization.map((u) => <tr key={u.id} className="border-t"><td className="py-1.5">{u.name}</td><td>{u.bookings}</td><td>{Number(u.booked_hours).toFixed(1)}</td></tr>)}</tbody></table>}</Card>
    </div>)
}
