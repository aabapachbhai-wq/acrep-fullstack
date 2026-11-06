import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { api } from '../lib/api'
import type { Notification } from '../lib/types'
import { useAsync } from '../lib/hooks'
import { dt } from '../lib/format'
import { Badge, Button, Card, Empty, ErrorState, PageTitle, Spinner } from '../components/ui'
export default function Notifications() {
  const { data, loading, error, reload } = useAsync(() => api.get<{ items: Notification[]; unread: number }>('/notifications/my'), [])
  useEffect(() => { const t = setInterval(() => reload(true), 30000); return () => clearInterval(t) }, [reload])
  const read = async (id: number) => { await api.put(`/notifications/${id}/read`).catch(() => {}); reload(true) }
  const all = async () => { await api.put('/notifications/read-all'); reload(true) }
  return (
    <div><PageTitle title="Notifications" sub={data ? `${data.unread} unread` : undefined} action={<Button variant="outline" onClick={all} disabled={!data?.unread}>Mark all as read</Button>} />
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !data?.items.length ? <Empty text="You're all caught up." /> :
        <div className="space-y-2">{data.items.map((n) => (
          <Card key={n.id} className={`flex items-start gap-3 p-4 ${n.is_read ? '' : 'border-teal-300 bg-teal-50/60'}`}><Bell size={16} className={n.is_read ? 'text-slate-400' : 'text-teal-700'} />
            <div className="flex-1 text-sm"><p className={n.is_read ? '' : 'font-medium'}>{n.message}</p><p className="text-xs text-slate-500"><Badge tone="Completed">{n.type}</Badge> {dt(n.created_at)} {n.link && <Link className="ml-2 text-teal-700" to={n.link}>Open</Link>}</p></div>
            {!n.is_read && <Button variant="ghost" onClick={() => read(n.id)}>Mark read</Button>}</Card>))}</div>}
    </div>)
}
