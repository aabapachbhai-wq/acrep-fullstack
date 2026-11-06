import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler } from '../lib/http.js'
const r = Router()
r.get('/', asyncHandler(async (_q, res) => { const [items] = await pool.query('SELECT id, name FROM categories ORDER BY id'); res.json({ items }) }))
export default r
