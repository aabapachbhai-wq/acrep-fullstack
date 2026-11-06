import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'
import { RESOURCE_COLS as COLS, RESOURCE_FROM as FROM } from '../lib/sql.js'
import { DISTANCE_SQL, validCoords } from '../services/geo.js'
import { baselineForecast } from '../services/forecast.js'
import { scoreResource } from '../services/recommend.js'
import { parseSearchQuery, aiEnabled } from '../services/ai.js'
const r = Router()
r.use(authenticate)
const num = (v) => (v === undefined || v === '' ? NaN : Number(v))

r.get('/dashboard', asyncHandler(async (req, res) => {
  const uid = req.user.id
  const [[own]] = await pool.query(`SELECT COUNT(*) AS listed, COALESCE(SUM(availability_status = 'Available' AND is_suspended = 0), 0) AS available FROM resources WHERE owner_id = ?`, [uid])
  const [[act]] = await pool.query(`SELECT COUNT(*) AS n FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE b.status = 'Approved' AND b.end_at > UTC_TIMESTAMP() AND (b.borrower_id = ? OR r.owner_id = ?)`, [uid, uid])
  const [[pend]] = await pool.query(`SELECT COUNT(*) AS n FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE b.status = 'Pending' AND r.owner_id = ?`, [uid])
  const [byCategory] = await pool.query(`SELECT c.name, COUNT(r.id) AS count FROM categories c LEFT JOIN resources r ON r.category_id = c.id AND r.is_suspended = 0 GROUP BY c.id, c.name ORDER BY c.id`)
  const [activity] = await pool.query(`SELECT DATE_FORMAT(b.start_at, '%Y-%m') AS ym, COUNT(*) AS count FROM bookings b JOIN resources r ON r.id = b.resource_id
    WHERE (b.borrower_id = ? OR r.owner_id = ?) AND b.start_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 MONTH) GROUP BY ym ORDER BY ym`, [uid, uid])
  const [recent] = await pool.query('SELECT id, type, message, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 5', [uid])
  const [latest] = await pool.query(`SELECT ${COLS}, NULL AS distance_km ${FROM} WHERE r.is_suspended = 0 ORDER BY r.created_at DESC LIMIT 30`)
  res.json({ metrics: { listed: own.listed, available: own.available, activeBookings: act.n, pendingRequests: pend.n }, byCategory, activity, recent, latest })
}))

r.get('/recommendations', asyncHandler(async (req, res) => {
  const q = req.query, uid = req.user.id
  const [cats] = await pool.query('SELECT id, name FROM categories')
  let categoryId = Number.isInteger(num(q.category_id)) ? num(q.category_id) : null
  let maxPrice = Number.isFinite(num(q.max_price)) ? num(q.max_price) : null
  let keywords = q.q ? String(q.q).toLowerCase().split(/\s+/).filter((w) => w.length > 2).slice(0, 8) : []
  let aiUsed = false
  if (q.q) {
    const parsed = await parseSearchQuery(q.q, cats.map((c) => c.name))
    if (parsed) {
      aiUsed = true
      if (!categoryId && parsed.category) categoryId = cats.find((c) => c.name === parsed.category)?.id ?? null
      if (maxPrice === null && parsed.max_price) maxPrice = parsed.max_price
      if (parsed.keywords.length) keywords = parsed.keywords.map((k) => k.toLowerCase())
    }
  }
  const lat = num(q.lat), lng = num(q.lng), hasLoc = validCoords(lat, lng)
  const start = q.start_at ? new Date(q.start_at) : null, end = q.end_at ? new Date(q.end_at) : null
  const window = start && end && !isNaN(start) && !isNaN(end) && end > start ? { start, end } : null
  const [cands] = await pool.query(`SELECT ${COLS}, ${hasLoc ? DISTANCE_SQL : 'NULL'} AS distance_km ${FROM}
    WHERE r.is_suspended = 0 AND r.owner_id <> ? AND r.availability_status = 'Available' LIMIT 300`, [...(hasLoc ? [lat, lng, lat] : []), uid])
  const [past] = await pool.query('SELECT DISTINCT r.category_id FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE b.borrower_id = ?', [uid])
  let busy = new Set()
  if (window) { const [rows] = await pool.query(`SELECT DISTINCT resource_id FROM bookings WHERE status IN ('Pending','Approved') AND start_at < ? AND end_at > ?`, [window.end, window.start]); busy = new Set(rows.map((x) => x.resource_id)) }
  const ctx = { categoryId, maxPrice, keywords, window, radiusKm: Number.isFinite(num(q.radius_km)) ? num(q.radius_km) : 15, pastCategories: new Set(past.map((p) => p.category_id)) }
  const items = cands.map((c) => ({ ...c, conflicts: busy.has(c.id) })).map((c) => ({ resource: c, ...scoreResource(c, ctx) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 12)
  res.json({ engine: aiUsed ? 'local-scoring + LLM query parsing' : 'local-scoring', ai_configured: aiEnabled(), ai_used: aiUsed, has_location: hasLoc, items })
}))

r.get('/demand', asyncHandler(async (req, res) => {
  const ACTIVE = `('Pending','Approved','Completed')`
  const [byCategory] = await pool.query(`SELECT c.name, COUNT(b.id) AS bookings FROM categories c LEFT JOIN resources r ON r.category_id = c.id LEFT JOIN bookings b ON b.resource_id = r.id AND b.status IN ${ACTIVE} GROUP BY c.id, c.name ORDER BY bookings DESC`)
  const [byMonth] = await pool.query(`SELECT DATE_FORMAT(start_at, '%Y-%m') AS ym, COUNT(*) AS bookings FROM bookings WHERE status IN ${ACTIVE} AND start_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 MONTH) GROUP BY ym ORDER BY ym`)
  const [byWeekday] = await pool.query(`SELECT DAYOFWEEK(start_at) AS dow, COUNT(*) AS bookings FROM bookings WHERE status IN ${ACTIVE} GROUP BY dow ORDER BY dow`)
  const [byHour] = await pool.query(`SELECT HOUR(start_at) AS hr, COUNT(*) AS bookings FROM bookings WHERE status IN ${ACTIVE} GROUP BY hr ORDER BY hr`)
  const [utilization] = await pool.query(`SELECT r.id, r.name, COUNT(b.id) AS bookings, COALESCE(SUM(b.duration_hours), 0) AS booked_hours FROM resources r
    LEFT JOIN bookings b ON b.resource_id = r.id AND b.status IN ('Approved','Completed') AND b.start_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY) AND b.start_at < UTC_TIMESTAMP()
    WHERE r.owner_id = ? GROUP BY r.id, r.name ORDER BY booked_hours DESC`, [req.user.id])
  const [dates] = await pool.query(`SELECT start_at FROM bookings WHERE status IN ('Approved','Completed')`)
  const [[demo]] = await pool.query('SELECT COUNT(*) AS n FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE r.is_demo = 1')
  res.json({ byCategory, byMonth, byWeekday, byHour, utilization, forecast: baselineForecast(dates.map((d) => d.start_at)), includesDemoData: demo.n > 0, timezoneNote: 'Weekday and hour are in UTC.' })
}))
export default r
