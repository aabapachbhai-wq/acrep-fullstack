import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { asyncHandler, HttpError, validate } from '../lib/http.js'
import { authenticate, signToken } from '../middleware/auth.js'
const r = Router()
const pub = (u) => ({ id: u.id, full_name: u.full_name, email: u.email, phone: u.phone, address: u.address, city: u.city, pincode: u.pincode, account_type: u.account_type, role: u.role, created_at: u.created_at })
const profile = {
  full_name: { required: true, min: 2, max: 100 },
  phone: { pattern: /^\d{10}$/, message: 'Enter a 10-digit phone number' },
  address: { max: 255 }, city: { max: 80 },
  pincode: { pattern: /^\d{6}$/, message: 'Enter a 6-digit pincode' },
  account_type: { required: true, enum: ['Owner', 'Borrower', 'Both'] },
}
r.post('/register', asyncHandler(async (req, res) => {
  const d = validate(req.body, { ...profile, email: { required: true, max: 150, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' }, password: { required: true, min: 8, max: 72 } })
  const email = d.email.toLowerCase()
  const [dup] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
  if (dup.length) throw new HttpError(409, 'Email already registered', { email: 'Email already registered' })
  const hash = await bcrypt.hash(d.password, 10)
  // `role` is never taken from the request: new accounts are always 'user'.
  const [ins] = await pool.query('INSERT INTO users (full_name,email,phone,password_hash,address,city,pincode,account_type) VALUES (?,?,?,?,?,?,?,?)',
    [d.full_name, email, d.phone || null, hash, d.address || null, d.city || null, d.pincode || null, d.account_type])
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [ins.insertId])
  res.status(201).json({ token: signToken(rows[0]), user: pub(rows[0]) })
}))
r.post('/login', asyncHandler(async (req, res) => {
  const d = validate(req.body, { email: { required: true }, password: { required: true } })
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [d.email.toLowerCase()])
  const u = rows[0]
  if (!u || !(await bcrypt.compare(d.password, u.password_hash))) throw new HttpError(401, 'Invalid email or password')
  if (!u.is_active) throw new HttpError(403, 'This account has been disabled')
  res.json({ token: signToken(u), user: pub(u) })
}))
r.get('/me', authenticate, asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]); res.json({ user: pub(rows[0]) })
}))
r.put('/me', authenticate, asyncHandler(async (req, res) => {
  const d = validate(req.body, profile)
  await pool.query('UPDATE users SET full_name=?, phone=?, address=?, city=?, pincode=?, account_type=? WHERE id=?',
    [d.full_name, d.phone || null, d.address || null, d.city || null, d.pincode || null, d.account_type, req.user.id])
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]); res.json({ user: pub(rows[0]) })
}))
export default r
