import { Router } from 'express'
import { pool, tx } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate, requireAccount } from '../middleware/auth.js'
import { validateWindow, computeAmount, canCancel, canComplete } from '../services/booking.js'
import { notify } from '../services/notify.js'
const r = Router()
const SELECT = `SELECT b.id, b.resource_id, r.name AS resource_name, r.owner_id, ou.full_name AS owner_name, b.borrower_id, bu.full_name AS borrower_name,
 b.start_at, b.end_at, b.duration_hours, b.total_amount, b.status, b.created_at,
 (SELECT p.status FROM payments p WHERE p.booking_id = b.id ORDER BY p.id DESC LIMIT 1) AS payment_status,
 EXISTS(SELECT 1 FROM reviews rv WHERE rv.booking_id = b.id) AS has_review
 FROM bookings b JOIN resources r ON r.id = b.resource_id JOIN users ou ON ou.id = r.owner_id JOIN users bu ON bu.id = b.borrower_id`
const idOf = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw new HttpError(404, 'Booking not found'); return n }
const lock = async (c, id) => {
  const [[b]] = await c.query('SELECT b.*, r.owner_id, r.name AS resource_name FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE b.id = ? FOR UPDATE', [id])
  if (!b) throw new HttpError(404, 'Booking not found'); return b
}

r.post('/', authenticate, requireAccount('Borrower', 'Both'), asyncHandler(async (req, res) => {
  const d = validate(req.body, { resource_id: { type: 'number', required: true, int: true, min: 1 }, start_at: { required: true }, end_at: { required: true } })
  const w = validateWindow(d.start_at, d.end_at)
  if (!w.ok) throw new HttpError(400, w.error, { time: w.error })
  const booking = await tx(async (c) => {
    // Row lock on the resource serialises concurrent bookings for it, so the overlap check below is race-free.
    const [[rs]] = await c.query('SELECT id, owner_id, name, price_per_hour, availability_status, is_suspended FROM resources WHERE id = ? FOR UPDATE', [d.resource_id])
    if (!rs || rs.is_suspended) throw new HttpError(404, 'Resource not found')
    if (rs.owner_id === req.user.id) throw new HttpError(403, 'You cannot book your own resource')
    if (rs.availability_status !== 'Available') throw new HttpError(409, `This resource is currently ${rs.availability_status.toLowerCase()}`)
    const [conf] = await c.query(`SELECT id FROM bookings WHERE resource_id = ? AND status IN ('Pending','Approved') AND start_at < ? AND end_at > ?`, [rs.id, w.end, w.start])
    if (conf.length) throw new HttpError(409, 'That time slot overlaps an existing booking')
    const amount = computeAmount(rs.price_per_hour, w.hours) // price is always computed server-side
    const [ins] = await c.query('INSERT INTO bookings (resource_id, borrower_id, start_at, end_at, duration_hours, total_amount) VALUES (?,?,?,?,?,?)', [rs.id, req.user.id, w.start, w.end, w.hours, amount])
    await notify(c, rs.owner_id, 'Booking', `New booking request for ${rs.name} from ${req.user.full_name}`, '/owner/bookings')
    return { id: ins.insertId, status: 'Pending', duration_hours: w.hours, total_amount: amount }
  })
  res.status(201).json({ item: booking })
}))

r.get('/my', authenticate, asyncHandler(async (req, res) => {
  const [items] = await pool.query(`${SELECT} WHERE b.borrower_id = ? ORDER BY b.start_at DESC`, [req.user.id]); res.json({ items })
}))
r.get('/owner', authenticate, asyncHandler(async (req, res) => {
  const [items] = await pool.query(`${SELECT} WHERE r.owner_id = ? ORDER BY b.start_at DESC`, [req.user.id])
  const sum = (s) => items.filter((b) => b.status === s).reduce((t, b) => t + Number(b.total_amount), 0)
  res.json({ items, summary: { earned: sum('Completed'), upcoming: sum('Approved'), pending: items.filter((b) => b.status === 'Pending').length } })
}))
r.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const [[b]] = await pool.query(`${SELECT} WHERE b.id = ?`, [idOf(req.params.id)])
  if (!b) throw new HttpError(404, 'Booking not found')
  if (![b.borrower_id, b.owner_id].includes(req.user.id) && req.user.role !== 'admin') throw new HttpError(403, 'Not your booking')
  res.json({ item: b })
}))

r.put('/:id/status', authenticate, asyncHandler(async (req, res) => {
  const { status } = validate(req.body, { status: { required: true, enum: ['Approved', 'Rejected'] } })
  await tx(async (c) => {
    const b = await lock(c, idOf(req.params.id))
    if (b.owner_id !== req.user.id) throw new HttpError(403, 'Only the resource owner can do this')
    if (b.status !== 'Pending') throw new HttpError(409, `This booking is already ${b.status}`)
    if (status === 'Approved') {
      if (new Date(b.start_at) <= new Date()) throw new HttpError(409, 'The requested start time has already passed')
      const [conf] = await c.query(`SELECT id FROM bookings WHERE resource_id = ? AND id <> ? AND status = 'Approved' AND start_at < ? AND end_at > ? FOR UPDATE`, [b.resource_id, b.id, b.end_at, b.start_at])
      if (conf.length) throw new HttpError(409, 'This request now conflicts with an already approved booking')
    }
    await c.query('UPDATE bookings SET status = ? WHERE id = ?', [status, b.id])
    await notify(c, b.borrower_id, 'Booking', `Your booking for ${b.resource_name} was ${status.toLowerCase()}`, '/bookings')
  })
  res.json({ ok: true })
}))
r.put('/:id/complete', authenticate, asyncHandler(async (req, res) => {
  await tx(async (c) => {
    const b = await lock(c, idOf(req.params.id))
    if (b.owner_id !== req.user.id) throw new HttpError(403, 'Only the resource owner can do this')
    if (!canComplete(b)) throw new HttpError(409, 'Only approved bookings that have started can be completed')
    await c.query(`UPDATE bookings SET status = 'Completed' WHERE id = ?`, [b.id])
    await notify(c, b.borrower_id, 'Booking', `Your booking for ${b.resource_name} is complete. You can now leave a review.`, '/bookings')
  })
  res.json({ ok: true })
}))
r.put('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  await tx(async (c) => {
    const b = await lock(c, idOf(req.params.id))
    if (b.borrower_id !== req.user.id) throw new HttpError(403, 'Only the borrower can cancel a booking')
    const ok = canCancel(b); if (!ok.ok) throw new HttpError(409, ok.error)
    await c.query(`UPDATE bookings SET status = 'Cancelled' WHERE id = ?`, [b.id])
    await notify(c, b.owner_id, 'Booking', `A booking for ${b.resource_name} was cancelled by the borrower`, '/owner/bookings')
  })
  res.json({ ok: true })
}))
export default r
