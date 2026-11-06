import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Link } from 'react-router-dom'
import type { Resource } from '../lib/types'
import { inr } from '../lib/format'
const COLORS = { Available: '#0f766e', Booked: '#d97706', Unavailable: '#64748b' }
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
// Marker style: colour = availability, shape = category (square for Parking, circle otherwise), letter = category initial.
const icon = (r: Resource) => L.divIcon({ className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
  html: `<div style="background:${COLORS[r.availability_status]};color:#fff;width:28px;height:28px;border-radius:${r.category === 'Parking' ? '6px' : '50%'};display:flex;align-items:center;justify-content:center;font:600 12px sans-serif;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)">${esc(r.category[0])}</div>` })
const dot = (c: string) => L.divIcon({ className: '', iconSize: [16, 16], iconAnchor: [8, 8], html: `<div style="background:${c};width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px ${c}"></div>` })
function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) { const map = useMap(); useEffect(() => { map.flyTo(center, zoom ?? map.getZoom()) }, [center[0], center[1]]); return null } // eslint-disable-line
function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) { useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) }); return null }
export default function ResourceMap({ resources, center, zoom = 12, height = 420, user, pin, onPick, radiusKm }: { resources: Resource[]; center: [number, number]; zoom?: number; height?: number; user?: [number, number] | null; pin?: [number, number] | null; onPick?: (lat: number, lng: number) => void; radiusKm?: number }) {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height, borderRadius: 12 }} scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Recenter center={center} zoom={zoom} />
      {onPick && <Picker onPick={onPick} />}
      {resources.map((r) => (
        <Marker key={r.id} position={[Number(r.latitude), Number(r.longitude)]} icon={icon(r)}>
          <Popup><div className="text-sm"><p className="font-semibold">{r.name}</p><p>{inr(r.price_per_hour)}/hr · {r.availability_status}</p>{r.distance_km != null && <p>{Number(r.distance_km).toFixed(1)} km away</p>}<Link to={`/resources/${r.id}`} className="font-medium text-teal-700">View details →</Link></div></Popup>
        </Marker>))}
      {user && <><Marker position={user} icon={dot('#2563eb')} />{radiusKm && <Circle center={user} radius={radiusKm * 1000} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.05 }} />}</>}
      {pin && <Marker position={pin} icon={dot('#dc2626')} />}
    </MapContainer>)
}
