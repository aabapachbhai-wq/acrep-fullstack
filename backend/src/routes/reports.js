import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'
const r = Router()
r.post('/', authenticate, asyncHandler(async (req, res) => {
  const d = validate(req.body, { resource_id: { type: 'number', required: true, int: true, min: 1 }, reason: { required: true, enum: ['Misleading listing', 'Wrong location', 'Unsafe', 'Spam', 'Other'] }, details: { max: 1000 } })
  const [x] = await pool.query('SELECT id FROM resources WHERE id = ?', [d.resource_id]); if (!x.length) throw new HttpError(404, 'Resource not found')
  await pool.query('INSERT INTO reports (resource_id, reporter_id, reason, details) VALUES (?,?,?,?)', [d.resource_id, req.user.id, d.reason, d.details || '']); res.status(201).json({ ok: true })
}))
export default r
