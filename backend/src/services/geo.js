const rad = (d) => (d * Math.PI) / 180
export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)))
}
// SQL haversine; bind params (lat, lng, lat). Requires table alias `r`.
export const DISTANCE_SQL = '(6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(r.latitude)) * COS(RADIANS(r.longitude) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(r.latitude)))))'
export const validCoords = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
