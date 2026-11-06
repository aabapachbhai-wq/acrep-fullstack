export const MIN_MINUTES = 30, MAX_HOURS = 24, CANCEL_NOTICE_HOURS = 2
export function validateWindow(startIso, endIso, now = new Date()) {
  const start = new Date(startIso), end = new Date(endIso)
  if (isNaN(start) || isNaN(end)) return { ok: false, error: 'Invalid start or end time' }
  if (end <= start) return { ok: false, error: 'End time must be after start time' }
  if (start <= now) return { ok: false, error: 'Start time must be in the future' }
  const minutes = (end - start) / 60000
  if (minutes < MIN_MINUTES) return { ok: false, error: `Minimum booking is ${MIN_MINUTES} minutes` }
  if (minutes > MAX_HOURS * 60) return { ok: false, error: `Maximum booking is ${MAX_HOURS} hours` }
  return { ok: true, start, end, hours: Math.round((minutes / 60) * 100) / 100 }
}
export const overlaps = (aS, aE, bS, bE) => new Date(aS) < new Date(bE) && new Date(bS) < new Date(aE)
export const computeAmount = (pricePerHour, hours) => Math.round(Number(pricePerHour) * hours * 100) / 100
export function canCancel(b, now = new Date()) {
  if (b.status === 'Pending') return { ok: true }
  if (b.status === 'Approved') {
    const h = (new Date(b.start_at) - now) / 3600000
    return h >= CANCEL_NOTICE_HOURS ? { ok: true } : { ok: false, error: `Approved bookings can only be cancelled ${CANCEL_NOTICE_HOURS}+ hours before the start time` }
  }
  return { ok: false, error: `A ${b.status} booking cannot be cancelled` }
}
export const canComplete = (b, now = new Date()) => b.status === 'Approved' && new Date(b.start_at) <= now
