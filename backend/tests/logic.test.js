import test from 'node:test'
import assert from 'node:assert/strict'
import { haversineKm } from '../src/services/geo.js'
import { validateWindow, overlaps, computeAmount, canCancel, canComplete } from '../src/services/booking.js'
import { baselineForecast } from '../src/services/forecast.js'
import { scoreResource } from '../src/services/recommend.js'
import { simulateCharge } from '../src/services/payment.js'

const now = new Date('2026-10-15T10:00:00Z')
const at = (h) => new Date(now.getTime() + h * 3600e3).toISOString()

test('haversine Pune-Mumbai is roughly 118-122 km', () => { const d = haversineKm(18.5204, 73.8567, 19.076, 72.8777); assert.ok(d > 115 && d < 125, String(d)) })
test('window: rejects end before/equal start, past, too short, too long', () => {
  assert.equal(validateWindow(at(3), at(2), now).ok, false)
  assert.equal(validateWindow(at(3), at(3), now).ok, false)
  assert.equal(validateWindow(at(-1), at(1), now).ok, false)
  assert.equal(validateWindow(at(1), at(1.25), now).ok, false)
  assert.equal(validateWindow(at(1), at(26), now).ok, false)
  assert.equal(validateWindow('nope', at(2), now).ok, false)
})
test('window: valid computes hours', () => { const w = validateWindow(at(1), at(3.5), now); assert.equal(w.ok, true); assert.equal(w.hours, 2.5) })
test('overlap: adjacent slots do not overlap, intersecting ones do', () => {
  assert.equal(overlaps(at(1), at(2), at(2), at(3)), false)
  assert.equal(overlaps(at(1), at(3), at(2), at(4)), true)
  assert.equal(overlaps(at(1), at(5), at(2), at(3)), true)
})
test('amount rounding', () => { assert.equal(computeAmount(60, 2.5), 150); assert.equal(computeAmount(33.33, 0.5), 16.67) })
test('cancel rules', () => {
  assert.equal(canCancel({ status: 'Pending', start_at: at(0.5) }, now).ok, true)
  assert.equal(canCancel({ status: 'Approved', start_at: at(1) }, now).ok, false)
  assert.equal(canCancel({ status: 'Approved', start_at: at(5) }, now).ok, true)
  assert.equal(canCancel({ status: 'Completed', start_at: at(-5) }, now).ok, false)
})
test('complete only after start', () => {
  assert.equal(canComplete({ status: 'Approved', start_at: at(-1) }, now), true)
  assert.equal(canComplete({ status: 'Approved', start_at: at(1) }, now), false)
  assert.equal(canComplete({ status: 'Pending', start_at: at(-1) }, now), false)
})
test('forecast: insufficient data is reported, not faked', () => {
  const f = baselineForecast([at(-10), at(-20)], now); assert.equal(f.sufficient, false); assert.match(f.reason, /at least 20/)
})
test('forecast: steady 3/week gives level 3 and zero backtest error', () => {
  const dates = []; for (let w = 0; w < 12; w++) for (let i = 0; i < 3; i++) dates.push(at(-(w * 168 + 24 + i * 5)))
  const f = baselineForecast(dates, now); assert.equal(f.sufficient, true); assert.deepEqual(f.forecast, [3, 3, 3, 3]); assert.equal(f.backtestMae, 0)
})
test('recommend: truthful reasons, penalties and rating threshold', () => {
  const base = { category_id: 1, price_per_hour: 50, availability_status: 'Available', avg_rating: 4.8, review_count: 2, distance_km: null, name: 'Fast charger', description: 'Home EV' }
  const a = scoreResource(base, { categoryId: 1 }); assert.ok(a.reasons.includes('Matches the category you asked for')); assert.ok(!a.reasons.some((r) => /Rated/.test(r)))
  assert.ok(!a.reasons.some((r) => /km away/.test(r)))
  const rated = scoreResource({ ...base, review_count: 5 }, {}); assert.ok(rated.reasons.some((r) => /Rated 4.8/.test(r)))
  assert.ok(scoreResource({ ...base, price_per_hour: 200 }, { maxPrice: 100 }).score < scoreResource(base, { maxPrice: 100 }).score)
  assert.ok(scoreResource({ ...base, conflicts: true }, { window: true }).score < 0 + scoreResource(base, { window: true }).score)
  const near = scoreResource({ ...base, distance_km: 1.5 }, { radiusKm: 15 }); assert.ok(near.reasons.some((r) => /1\.5 km/.test(r)))
})
test('simulated payment: cash stays pending, others paid, reference marked SIM', () => {
  assert.equal(simulateCharge('Cash').status, 'Pending'); const u = simulateCharge('UPI'); assert.equal(u.status, 'Paid'); assert.match(u.reference, /^SIM-/)
})
