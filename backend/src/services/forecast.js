const WEEK = 7 * 24 * 3600 * 1000
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length
export function weeklyBuckets(dates, now, weeks) {
  const counts = new Array(weeks).fill(0) // index 0 = oldest week
  for (const d of dates) { const age = Math.floor((now - new Date(d)) / WEEK); if (age >= 0 && age < weeks) counts[weeks - 1 - age]++ }
  return counts
}
// Transparent baseline: moving average of recent weekly booking counts, with a backtested MAE.
export function baselineForecast(dates, now = new Date(), { minWeeks = 8, minBookings = 20, horizon = 4, window = 4 } = {}) {
  const past = dates.map((d) => new Date(d)).filter((d) => d <= now)
  if (past.length < minBookings) return { sufficient: false, reason: `Needs at least ${minBookings} past bookings; found ${past.length}.` }
  const spanWeeks = Math.floor((now - Math.min(...past)) / WEEK)
  if (spanWeeks < minWeeks) return { sufficient: false, reason: `Needs at least ${minWeeks} weeks of history; found ${spanWeeks}.` }
  const weeks = Math.min(spanWeeks, 26)
  const history = weeklyBuckets(past, now, weeks)
  const errs = []
  for (let i = window; i < history.length; i++) errs.push(Math.abs(history[i] - mean(history.slice(i - window, i))))
  const level = Math.round(mean(history.slice(-window)) * 10) / 10
  return { sufficient: true, method: `${window}-week moving average (flat projection)`, weeks, history, forecast: new Array(horizon).fill(level), backtestMae: Math.round(mean(errs) * 100) / 100 }
}
