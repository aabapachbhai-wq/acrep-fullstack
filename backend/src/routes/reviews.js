import { Router } from 'express'
import { pool, tx } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'
import { notify } from '../services/notify.js'
const r = Router()
r.post('/', authenticate, asyncHandler(async (req, res) => {
  const d = validate(req.body, { booking_id: { type: 'number', required: true, int: true, min: 1 }, rating: { type: 'number', required: true, int: true, min: 1, max: 5 }, comment: { max: 1000 } })
  await tx(async (c) => {
    const [[b]] = await c.query('SELECT b.id, b.borrower_id, b.status, b.resource_id, r.owner_id, r.name FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE b.id = ? FOR UPDATE', [d.booking_id])
    if (!b) throw new HttpError(404, 'Booking not found')
    if (b.borrower_id !== req.user.id) throw new HttpError(403, 'Only the borrower can review this booking')
    if (b.status !== 'Completed') throw new HttpError(409, 'Only completed bookings can be reviewed')
    try { await c.query('INSERT INTO reviews (booking_id, resource_id, reviewer_id, rating, comment) VALUES (?,?,?,?,?)', [b.id, b.resource_id, req.user.id, d.rating, d.comment || '']) }
    catch (e) { if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'You have already reviewed this booking'); throw e }
    await notify(c, b.owner_id, 'General', `New ${d.rating}-star review on ${b.name}`, `/resources/${b.resource_id}`)
  })
  res.status(201).json({ ok: true })
}))
// Comments are stored as plain text and rendered as text by the frontend (React escapes). Only the reviewer's first name is exposed.
r.get('/resource/:id', asyncHandler(async (req, res) => {
  const id = Number(req.params.id); if (!Number.isInteger(id)) throw new HttpError(404, 'Resource not found')
  const [items] = await pool.query(`SELECT rv.id, rv.rating, rv.comment, rv.created_at, SUBSTRING_INDEX(u.full_name, ' ', 1) AS reviewer FROM reviews rv JOIN users u ON u.id = rv.reviewer_id WHERE rv.resource_id = ? ORDER BY rv.id DESC`, [id])
  const average = items.length ? Math.round((items.reduce((s, x) => s + x.rating, 0) / items.length) * 10) / 10 : null
  res.json({ items, average, count: items.length })
}))
export default r
