import { Router } from 'express'
import { pool, tx } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'
import { simulateCharge } from '../services/payment.js'
import { notify } from '../services/notify.js'
const r = Router()
const LIST = `SELECT p.id, p.booking_id, p.amount, p.method, p.status, p.reference, p.is_simulated, p.created_at, r.name AS resource_name, bu.full_name AS payer_name
 FROM payments p JOIN bookings b ON b.id = p.booking_id JOIN resources r ON r.id = b.resource_id JOIN users bu ON bu.id = p.payer_id`
r.post('/', authenticate, asyncHandler(async (req, res) => {
  const d = validate(req.body, { booking_id: { type: 'number', required: true, int: true, min: 1 }, method: { required: true, enum: ['UPI', 'Card', 'Cash', 'NetBanking'] } })
  const out = await tx(async (c) => {
    const [[b]] = await c.query('SELECT b.*, r.owner_id, r.name AS resource_name FROM bookings b JOIN resources r ON r.id = b.resource_id WHERE b.id = ? FOR UPDATE', [d.booking_id])
    if (!b) throw new HttpError(404, 'Booking not found')
    if (b.borrower_id !== req.user.id) throw new HttpError(403, 'You can only pay for your own bookings')
    if (!['Approved', 'Completed'].includes(b.status)) throw new HttpError(409, 'Payment opens after the owner approves the booking')
    const [ex] = await c.query(`SELECT id FROM payments WHERE booking_id = ? AND status IN ('Paid','Pending')`, [b.id])
    if (ex.length) throw new HttpError(409, 'A payment is already recorded for this booking')
    const sim = simulateCharge(d.method)
    const [ins] = await c.query('INSERT INTO payments (booking_id, payer_id, amount, method, status, reference) VALUES (?,?,?,?,?,?)', [b.id, req.user.id, b.total_amount, d.method, sim.status, sim.reference])
    await notify(c, b.owner_id, 'Payment', `Simulated ${d.method} payment (${sim.status.toLowerCase()}) for ${b.resource_name}`, '/payments')
    await notify(c, req.user.id, 'Payment', `Simulated payment ${sim.status.toLowerCase()} for ${b.resource_name} (ref ${sim.reference})`, '/payments')
    return { id: ins.insertId, status: sim.status, reference: sim.reference, amount: b.total_amount, method: d.method }
  })
  res.status(201).json({ item: out })
}))
r.get('/my', authenticate, asyncHandler(async (req, res) => { const [items] = await pool.query(`${LIST} WHERE p.payer_id = ? ORDER BY p.id DESC`, [req.user.id]); res.json({ items }) }))
r.get('/received', authenticate, asyncHandler(async (req, res) => { const [items] = await pool.query(`${LIST} WHERE r.owner_id = ? ORDER BY p.id DESC`, [req.user.id]); res.json({ items }) }))
export default r
