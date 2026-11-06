import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
const r = Router()
r.use(authenticate, requireAdmin) // role is read from the DB in authenticate
r.get('/summary', asyncHandler(async (_q, res) => {
  const one = async (sql) => (await pool.query(sql))[0][0]
  const users = await one('SELECT COUNT(*) AS n FROM users'), resources = await one('SELECT COUNT(*) AS n FROM resources')
  const active = await one(`SELECT COUNT(*) AS n FROM resources WHERE availability_status = 'Available' AND is_suspended = 0`)
  const bookings = await one('SELECT COUNT(*) AS n FROM bookings'), paid = await one(`SELECT COALESCE(SUM(amount), 0) AS s, COUNT(*) AS n FROM payments WHERE status = 'Paid'`)
  const openReports = await one(`SELECT COUNT(*) AS n FROM reports WHERE status = 'Open'`)
  const [byStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM bookings GROUP BY status')
  const [byCategory] = await pool.query(`SELECT c.name, COUNT(DISTINCT r.id) AS resources, COUNT(b.id) AS bookings, COALESCE(SUM(CASE WHEN b.status = 'Completed' THEN b.total_amount END), 0) AS value
    FROM categories c LEFT JOIN resources r ON r.category_id = c.id LEFT JOIN bookings b ON b.resource_id = r.id GROUP BY c.id, c.name ORDER BY c.id`)
  const [recentBookings] = await pool.query(`SELECT b.id, r.name AS resource_name, u.full_name AS borrower_name, b.total_amount, b.status, b.start_at FROM bookings b JOIN resources r ON r.id = b.resource_id JOIN users u ON u.id = b.borrower_id ORDER BY b.id DESC LIMIT 10`)
  res.json({ totals: { users: users.n, resources: resources.n, activeResources: active.n, bookings: bookings.n, paidPayments: paid.n, simulatedPaidTotal: paid.s, openReports: openReports.n }, byStatus, byCategory, recentBookings })
}))
r.get('/users', asyncHandler(async (_q, res) => { const [items] = await pool.query('SELECT id, full_name, email, city, account_type, role, is_active, is_demo, created_at FROM users ORDER BY id DESC LIMIT 100'); res.json({ items }) }))
r.put('/users/:id/status', asyncHandler(async (req, res) => {
  const id = Number(req.params.id); const d = validate(req.body, { is_active: { type: 'number', required: true, min: 0, max: 1, int: true } })
  if (id === req.user.id) throw new HttpError(400, 'You cannot change your own status')
  const [[t]] = await pool.query('SELECT role FROM users WHERE id = ?', [id]); if (!t) throw new HttpError(404, 'User not found')
  if (t.role === 'admin') throw new HttpError(403, 'Admin accounts cannot be disabled here')
  await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [d.is_active, id]); res.json({ ok: true })
}))
r.get('/resources', asyncHandler(async (_q, res) => {
  const [items] = await pool.query(`SELECT r.id, r.name, c.name AS category, u.full_name AS owner_name, r.price_per_hour, r.availability_status, r.is_suspended, r.is_demo,
    (SELECT COUNT(*) FROM reports x WHERE x.resource_id = r.id AND x.status = 'Open') AS open_reports FROM resources r JOIN categories c ON c.id = r.category_id JOIN users u ON u.id = r.owner_id ORDER BY open_reports DESC, r.id DESC LIMIT 100`)
  res.json({ items })
}))
r.put('/resources/:id/moderation', asyncHandler(async (req, res) => {
  const d = validate(req.body, { is_suspended: { type: 'number', required: true, min: 0, max: 1, int: true } })
  const [u] = await pool.query('UPDATE resources SET is_suspended = ? WHERE id = ?', [d.is_suspended, Number(req.params.id)]); if (!u.affectedRows) throw new HttpError(404, 'Resource not found'); res.json({ ok: true })
}))
r.get('/reports', asyncHandler(async (_q, res) => {
  const [items] = await pool.query(`SELECT x.id, x.resource_id, r.name AS resource_name, u.full_name AS reporter_name, x.reason, x.details, x.status, x.created_at FROM reports x JOIN resources r ON r.id = x.resource_id JOIN users u ON u.id = x.reporter_id ORDER BY x.status = 'Open' DESC, x.id DESC LIMIT 100`)
  res.json({ items })
}))
r.put('/reports/:id', asyncHandler(async (req, res) => {
  const d = validate(req.body, { status: { required: true, enum: ['Resolved', 'Dismissed'] } })
  const [u] = await pool.query('UPDATE reports SET status = ? WHERE id = ?', [d.status, Number(req.params.id)]); if (!u.affectedRows) throw new HttpError(404, 'Report not found'); res.json({ ok: true })
}))
export default r
