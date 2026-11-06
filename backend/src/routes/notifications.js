import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'
import { notify } from '../services/notify.js'
const r = Router()
// Reminders are generated lazily (on poll/list) for approved bookings starting within 24h; reminder_sent prevents duplicates.
async function reminders(uid) {
  const [rows] = await pool.query(`SELECT b.id, rs.name FROM bookings b JOIN resources rs ON rs.id = b.resource_id
    WHERE b.borrower_id = ? AND b.status = 'Approved' AND b.reminder_sent = 0 AND b.start_at > UTC_TIMESTAMP() AND b.start_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR)`, [uid])
  for (const b of rows) {
    const [u] = await pool.query('UPDATE bookings SET reminder_sent = 1 WHERE id = ? AND reminder_sent = 0', [b.id])
    if (u.affectedRows) await notify(pool, uid, 'Reminder', `Upcoming booking: ${b.name} starts within 24 hours`, '/bookings')
  }
}
const unread = async (uid) => (await pool.query('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [uid]))[0][0].n
r.get('/my', authenticate, asyncHandler(async (req, res) => {
  await reminders(req.user.id)
  const [items] = await pool.query('SELECT id, type, message, link, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id])
  res.json({ items, unread: await unread(req.user.id) })
}))
r.get('/unread-count', authenticate, asyncHandler(async (req, res) => { await reminders(req.user.id); res.json({ unread: await unread(req.user.id) }) }))
r.put('/read-all', authenticate, asyncHandler(async (req, res) => { await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]); res.json({ ok: true }) }))
r.put('/:id/read', authenticate, asyncHandler(async (req, res) => {
  const [u] = await pool.query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [Number(req.params.id), req.user.id])
  if (!u.affectedRows) throw new HttpError(404, 'Notification not found'); res.json({ ok: true })
}))
export default r
