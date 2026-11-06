import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { authenticate } from '../middleware/auth.js'
import { RESOURCE_COLS as COLS, RESOURCE_FROM as FROM } from '../lib/sql.js'
const r = Router()
r.use(authenticate)
r.get('/', asyncHandler(async (req, res) => {
  const [items] = await pool.query(`SELECT ${COLS}, NULL AS distance_km ${FROM} JOIN favourites f ON f.resource_id = r.id WHERE f.user_id = ? AND r.is_suspended = 0 ORDER BY f.created_at DESC`, [req.user.id]); res.json({ items })
}))
r.get('/ids', asyncHandler(async (req, res) => { const [rows] = await pool.query('SELECT resource_id FROM favourites WHERE user_id = ?', [req.user.id]); res.json({ ids: rows.map((x) => x.resource_id) }) }))
r.post('/:rid', asyncHandler(async (req, res) => {
  const rid = Number(req.params.rid)
  const [x] = await pool.query('SELECT id FROM resources WHERE id = ? AND is_suspended = 0', [rid]); if (!x.length) throw new HttpError(404, 'Resource not found')
  await pool.query('INSERT IGNORE INTO favourites (user_id, resource_id) VALUES (?,?)', [req.user.id, rid]); res.status(201).json({ ok: true })
}))
r.delete('/:rid', asyncHandler(async (req, res) => { await pool.query('DELETE FROM favourites WHERE user_id = ? AND resource_id = ?', [req.user.id, Number(req.params.rid)]); res.json({ ok: true }) }))
export default r
