import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate, optionalAuth, requireAccount } from '../middleware/auth.js'
import { RESOURCE_COLS as COLS, RESOURCE_FROM as FROM } from '../lib/sql.js'
import { DISTANCE_SQL, validCoords } from '../services/geo.js'
const r = Router()
const STATUSES = ['Available', 'Booked', 'Unavailable']
const schema = {
  name: { required: true, min: 3, max: 120 }, category_id: { type: 'number', required: true, int: true, min: 1 },
  description: { required: true, min: 10, max: 2000 }, price_per_hour: { type: 'number', required: true, min: 1, max: 100000 },
  address: { required: true, min: 5, max: 255 }, latitude: { type: 'number', required: true, min: -90, max: 90 }, longitude: { type: 'number', required: true, min: -180, max: 180 },
  availability_status: { enum: STATUSES, default: 'Available' }, image_url: { max: 500, pattern: /^https?:\/\//, message: 'Must start with http:// or https://' },
}
const esc = (s) => `%${String(s).slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`
const num = (v) => (v === undefined || v === '' ? NaN : Number(v))
const idOr404 = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw new HttpError(404, 'Resource not found'); return n }

r.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const q = req.query, lat = num(q.lat), lng = num(q.lng), hasLoc = validCoords(lat, lng)
  const sel = [], where = ['r.is_suspended = 0'], wp = [], having = [], hp = []
  let dist = 'NULL'
  if (hasLoc) { dist = DISTANCE_SQL; sel.push(lat, lng, lat) }
  if (q.q) { where.push('(r.name LIKE ? OR r.description LIKE ?)'); wp.push(esc(q.q), esc(q.q)) }
  if (Number.isInteger(num(q.category_id))) { where.push('r.category_id = ?'); wp.push(num(q.category_id)) }
  if (Number.isFinite(num(q.min_price))) { where.push('r.price_per_hour >= ?'); wp.push(num(q.min_price)) }
  if (Number.isFinite(num(q.max_price))) { where.push('r.price_per_hour <= ?'); wp.push(num(q.max_price)) }
  if (STATUSES.includes(q.availability)) { where.push('r.availability_status = ?'); wp.push(q.availability) }
  if (q.location) { where.push('r.address LIKE ?'); wp.push(esc(q.location)) }
  if (hasLoc && Number.isFinite(num(q.radius_km))) { having.push('distance_km <= ?'); hp.push(num(q.radius_km)) }
  const base = `SELECT ${COLS}, ${dist} AS distance_km ${FROM} WHERE ${where.join(' AND ')}${having.length ? ' HAVING ' + having.join(' AND ') : ''}`
  const params = [...sel, ...wp, ...hp]
  let order = 'avg_rating DESC, r.created_at DESC', op = []
  if (q.sort === 'price_asc') order = 'r.price_per_hour ASC'
  else if (q.sort === 'price_desc') order = 'r.price_per_hour DESC'
  else if (q.sort === 'distance' && hasLoc) order = 'distance_km ASC'
  else if (q.q) { order = '((r.name LIKE ?) * 2 + (r.description LIKE ?)) DESC, ' + order; op = [esc(q.q), esc(q.q)] }
  const page = Math.max(1, parseInt(q.page) || 1), size = Math.min(50, Math.max(1, parseInt(q.page_size) || 12))
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${base}) t`, params)
  const [items] = await pool.query(`${base} ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, ...op, size, (page - 1) * size])
  res.json({ items, total, page, page_size: size })
}))

r.get('/mine', authenticate, asyncHandler(async (req, res) => {
  const [items] = await pool.query(`SELECT ${COLS}, NULL AS distance_km,
    (SELECT COUNT(*) FROM bookings b WHERE b.resource_id = r.id) AS booking_count,
    (SELECT COUNT(*) FROM bookings b WHERE b.resource_id = r.id AND b.status = 'Pending') AS pending_count
    ${FROM} WHERE r.owner_id = ? ORDER BY r.created_at DESC`, [req.user.id])
  res.json({ items })
}))

r.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id)
  const [rows] = await pool.query(`SELECT ${COLS}, NULL AS distance_km ${FROM} WHERE r.id = ?`, [id])
  const item = rows[0]
  if (!item || (item.is_suspended && item.owner_id !== req.user?.id && req.user?.role !== 'admin')) throw new HttpError(404, 'Resource not found')
  res.json({ item })
}))

r.get('/:id/similar', asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id)
  const [[cur]] = await pool.query('SELECT category_id, latitude, longitude FROM resources WHERE id = ?', [id])
  if (!cur) throw new HttpError(404, 'Resource not found')
  const [items] = await pool.query(`SELECT ${COLS}, NULL AS distance_km ${FROM} WHERE r.category_id = ? AND r.id <> ? AND r.is_suspended = 0
    ORDER BY ABS(r.latitude - ?) + ABS(r.longitude - ?) ASC LIMIT 4`, [cur.category_id, id, cur.latitude, cur.longitude])
  res.json({ items })
}))

// Busy intervals only (no borrower details) so the booking form can show what is taken.
r.get('/:id/availability', asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id)
  const from = req.query.from ? new Date(req.query.from) : new Date(), to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 30 * 864e5)
  if (isNaN(from) || isNaN(to)) throw new HttpError(400, 'Invalid from/to')
  const [items] = await pool.query(`SELECT start_at, end_at, status FROM bookings WHERE resource_id = ? AND status IN ('Pending','Approved') AND start_at < ? AND end_at > ? ORDER BY start_at`, [id, to, from])
  res.json({ items })
}))

async function categoryExists(id) { const [x] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]); if (!x.length) throw new HttpError(400, 'Validation failed', { category_id: 'Unknown category' }) }
async function ownedBy(id, userId) {
  const [[row]] = await pool.query('SELECT id, owner_id FROM resources WHERE id = ?', [id])
  if (!row) throw new HttpError(404, 'Resource not found')
  if (row.owner_id !== userId) throw new HttpError(403, 'You can only modify your own resources')
}

r.post('/', authenticate, requireAccount('Owner', 'Both'), asyncHandler(async (req, res) => {
  const d = validate(req.body, schema); await categoryExists(d.category_id)
  const [ins] = await pool.query('INSERT INTO resources (owner_id,category_id,name,description,price_per_hour,address,latitude,longitude,availability_status,image_url) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [req.user.id, d.category_id, d.name, d.description, d.price_per_hour, d.address, d.latitude, d.longitude, d.availability_status, d.image_url || null])
  res.status(201).json({ id: ins.insertId })
}))
r.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id); await ownedBy(id, req.user.id)
  const d = validate(req.body, schema); await categoryExists(d.category_id)
  await pool.query('UPDATE resources SET category_id=?,name=?,description=?,price_per_hour=?,address=?,latitude=?,longitude=?,availability_status=?,image_url=? WHERE id=?',
    [d.category_id, d.name, d.description, d.price_per_hour, d.address, d.latitude, d.longitude, d.availability_status, d.image_url || null, id])
  res.json({ ok: true })
}))
r.put('/:id/availability', authenticate, asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id); await ownedBy(id, req.user.id)
  const d = validate(req.body, { availability_status: { required: true, enum: STATUSES } })
  await pool.query('UPDATE resources SET availability_status = ? WHERE id = ?', [d.availability_status, id]); res.json({ ok: true })
}))
r.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = idOr404(req.params.id); await ownedBy(id, req.user.id)
  const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM bookings WHERE resource_id = ? AND status IN ('Pending','Approved')`, [id])
  if (n) throw new HttpError(409, 'This resource has pending or approved bookings. Resolve them or mark it Unavailable instead.')
  await pool.query('DELETE FROM resources WHERE id = ?', [id]); res.json({ ok: true })
}))
export default r
