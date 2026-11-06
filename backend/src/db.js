import mysql from 'mysql2/promise'
import { config } from './config.js'
// timezone 'Z': all DATETIME values are read/written as UTC.
export const pool = mysql.createPool({ ...config.db, waitForConnections: true, connectionLimit: 10, timezone: 'Z', decimalNumbers: true })
export async function tx(fn) {
  const c = await pool.getConnection()
  try { await c.beginTransaction(); const r = await fn(c); await c.commit(); return r }
  catch (e) { await c.rollback(); throw e } finally { c.release() }
}
