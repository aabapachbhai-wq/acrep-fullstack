import { api } from '../lib/api'
import type { Resource } from '../lib/types'
import { useAsync, useFavourites } from '../lib/hooks'
import ResourceCard from '../components/ResourceCard'
import { Empty, ErrorState, PageTitle, Spinner } from '../components/ui'
import { Link } from 'react-router-dom'
export default function Favourites() {
  const { data, loading, error, reload } = useAsync(() => api.get<{ items: Resource[] }>('/favourites'), []); const fav = useFavourites()
  return (
    <div><PageTitle title="Favourites" />
      {loading ? <Spinner /> : error ? <ErrorState text={error} retry={reload} /> : !data?.items.length ? <Empty text="No saved resources yet." action={<Link className="text-teal-700" to="/explore">Explore resources</Link>} /> :
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((r) => <ResourceCard key={r.id} r={r} fav={fav.ids.has(r.id)} onFav={async (id) => { await fav.toggle(id); setTimeout(() => reload(true), 150) }} />)}</div>}
    </div>)
}
