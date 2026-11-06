import { Link } from 'react-router-dom'
import { Heart, MapPin, Star, Zap } from 'lucide-react'
import type { Resource } from '../lib/types'
import { inr } from '../lib/format'
import { Badge, Card } from './ui'
export default function ResourceCard({ r, fav, onFav }: { r: Resource; fav?: boolean; onFav?: (id: number) => void }) {
  return (
    <Card className="flex flex-col gap-2 p-0 transition hover:shadow-md">
      <div className="relative h-32 overflow-hidden rounded-t-xl bg-gradient-to-br from-teal-50 to-slate-100">
        {r.image_url ? <img src={r.image_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-teal-700"><Zap /></div>}
        {onFav && <button onClick={() => onFav(r.id)} aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5"><Heart size={16} className={fav ? 'fill-red-500 text-red-500' : 'text-slate-500'} /></button>}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-4">
        <div className="flex flex-wrap gap-1.5"><Badge tone="Completed">{r.category}</Badge><Badge>{r.availability_status}</Badge>{!!r.is_demo && <Badge tone="demo">Demo data</Badge>}</div>
        <h3 className="font-semibold leading-tight">{r.name}</h3>
        <p className="flex items-center gap-1 text-xs text-slate-500"><MapPin size={12} />{r.address}{r.distance_km != null && ` · ${Number(r.distance_km).toFixed(1)} km`}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold">{inr(r.price_per_hour)}<span className="text-xs font-normal text-slate-500">/hr</span></span>
          {r.review_count > 0 ? <span className="flex items-center gap-1 text-xs"><Star size={12} className="fill-amber-400 text-amber-400" />{r.avg_rating} ({r.review_count})</span> : <span className="text-xs text-slate-400">No reviews yet</span>}
        </div>
        <Link to={`/resources/${r.id}`} className="mt-1 rounded-lg border border-teal-700 py-1.5 text-center text-sm font-medium text-teal-700 hover:bg-teal-50">View details</Link>
      </div>
    </Card>)
}
