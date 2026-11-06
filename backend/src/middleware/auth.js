import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { pool } from '../db.js'
import { HttpError, asyncHandler } from '../lib/http.js'
async function load(req, required) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) { if (required) throw new HttpError(401, 'Authentication required'); return }
  let payload
  try { payload = jwt.verify(token, config.jwtSecret) } catch { throw new HttpError(401, 'Invalid or expired token') }
  // Role and account type are always read from the database, never trusted from the client/token.
  const [rows] = await pool.query('SELECT id, full_name, email, account_type, role, is_active FROM users WHERE id = ?', [payload.id])
  if (!rows[0] || !rows[0].is_active) throw new HttpError(401, 'Account not available')
  req.user = rows[0]
}
export const authenticate = asyncHandler(async (req, _res, next) => { await load(req, true); next() })
export const optionalAuth = asyncHandler(async (req, _res, next) => { await load(req, false); next() })
export const requireAccount = (...types) => (req, _res, next) =>
  types.includes(req.user.account_type) ? next() : next(new HttpError(403, `This action requires a ${types.join(' or ')} account`))
export const requireAdmin = (req, _res, next) => (req.user.role === 'admin' ? next() : next(new HttpError(403, 'Admin access required')))
export const signToken = (u) => jwt.sign({ id: u.id }, config.jwtSecret, { expiresIn: '7d' })
