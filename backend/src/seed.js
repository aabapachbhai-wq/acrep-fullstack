// Demo seed. All rows are flagged is_demo=1; coordinates are approximate neighbourhood centres in Pune, NOT real addresses.
import bcrypt from 'bcryptjs'
import { pool } from './db.js'
import { computeAmount } from './services/booking.js'
if (process.env.NODE_ENV === 'production') { console.error('Refusing to seed in production'); process.exit(1) }
const reset = process.argv.includes('--reset')
const PW = process.env.DEMO_PASSWORD || 'Demo@12345'
const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM users WHERE is_demo = 1')
if (n && !reset) { console.log('Demo data already present. Run `npm run seed -- --reset` to recreate.'); process.exit(0) }
if (reset) await pool.query('DELETE FROM users WHERE is_demo = 1')
const hash = await bcrypt.hash(PW, 10)
const users = [['Admin (demo)', 'admin@acrep.demo', 'Both', 'admin'], ['Asha Kulkarni (demo)', 'owner1@acrep.demo', 'Owner', 'user'], ['Vikram Joshi (demo)', 'owner2@acrep.demo', 'Both', 'user'],
  ['Rohan Mehta (demo)', 'borrower1@acrep.demo', 'Borrower', 'user'], ['Priya Shah (demo)', 'borrower2@acrep.demo', 'Borrower', 'user']]
const uid = []
for (const [name, email, type, role] of users) {
  const [ins] = await pool.query('INSERT INTO users (full_name,email,phone,password_hash,city,account_type,role,is_demo) VALUES (?,?,?,?,?,?,?,1)', [name, email, '9000000000', hash, 'Pune', type, role]); uid.push(ins.insertId)
}
const [cats] = await pool.query('SELECT id, name FROM categories'); const cat = Object.fromEntries(cats.map((c) => [c.name, c.id]))
const R = [
  [1, 'EV Chargers', 'Level 2 home EV charger', 'Type-2 wall charger in a private driveway. Sample listing.', 60, 'Koregaon Park, Pune', 18.5362, 73.894],
  [1, 'Parking', 'Covered parking slot', 'Gated covered slot near the main road. Sample listing.', 25, 'Baner, Pune', 18.559, 73.7868],
  [1, 'Power Tools', 'Cordless drill & bit set', 'Drill with 40-piece bit set. Sample listing.', 30, 'Viman Nagar, Pune', 18.5679, 73.9143],
  [2, 'Washing Machines', 'Front-load washing machine', '7 kg front loader, detergent not included. Sample listing.', 70, 'Kothrud, Pune', 18.5074, 73.8077],
  [2, 'Printers', 'Colour laser printer', 'A4 colour printing, you bring the files. Sample listing.', 40, 'Aundh, Pune', 18.558, 73.8075],
  [2, 'Solar Energy', 'Rooftop solar power bank hub', 'Shared solar-backed charging point. Sample listing.', 35, 'Hinjewadi, Pune', 18.5912, 73.7389],
  [1, 'Parking', 'Open lot parking bay', 'Open-air bay, weekday evenings. Sample listing.', 20, 'Kalyani Nagar, Pune', 18.5463, 73.9034],
  [2, 'Power Tools', 'Pressure washer', 'Electric pressure washer, 1800 W. Sample listing.', 55, 'Wakad, Pune', 18.5987, 73.7602],
  [1, 'EV Chargers', 'Fast AC charger (shared)', 'Shared society charger, book ahead. Sample listing.', 75, 'Magarpatta, Pune', 18.5158, 73.9272],
  [2, 'Other', 'Folding event tables (set of 4)', 'Four folding tables for small gatherings. Sample listing.', 15, 'Hadapsar, Pune', 18.5089, 73.926],
]
const rid = []
for (const [o, c, name, desc, price, addr, lat, lng] of R) {
  const [ins] = await pool.query('INSERT INTO resources (owner_id,category_id,name,description,price_per_hour,address,latitude,longitude,is_demo) VALUES (?,?,?,?,?,?,?,?,1)', [uid[o], cat[c], name, desc, price, addr, lat, lng]); rid.push(ins.insertId)
}
const borrowers = [uid[3], uid[4]], now = Date.now(), DAY = 864e5
let k = 0
async function book(ri, start, hours, status, borrower) {
  const end = new Date(start.getTime() + hours * 3600e3), amt = computeAmount(R[ri][4], hours)
  const [b] = await pool.query('INSERT INTO bookings (resource_id,borrower_id,start_at,end_at,duration_hours,total_amount,status) VALUES (?,?,?,?,?,?,?)', [rid[ri], borrower, start, end, hours, amt, status]); return [b.insertId, amt]
}
for (let w = 1; w <= 12; w++) for (let i = 0; i < (w % 3) + 2; i++) {
  const ri = (w * 3 + i * 2) % R.length, start = new Date(now - (w * 7 - i * 2) * DAY); start.setUTCHours(4 + i * 3, 30, 0, 0)
  const borrower = borrowers[(w + i) % 2], [bid, amt] = await book(ri, start, 1 + ((w + i) % 3), 'Completed', borrower)
  await pool.query(`INSERT INTO payments (booking_id,payer_id,amount,method,status,reference) VALUES (?,?,?,?, 'Paid', ?)`, [bid, borrower, amt, ['UPI', 'Card', 'NetBanking'][k % 3], `SIM-DEMO${String(k).padStart(4, '0')}`])
  if (k % 3 === 0) await pool.query('INSERT INTO reviews (booking_id,resource_id,reviewer_id,rating,comment) VALUES (?,?,?,?,?)', [bid, rid[ri], borrower, 3 + (k % 3), 'Sample review (demo data).'])
  k++
}
const f1 = new Date(now + 3 * DAY); f1.setUTCHours(5, 0, 0, 0); await book(0, f1, 2, 'Pending', uid[3])
const f2 = new Date(now + 5 * DAY); f2.setUTCHours(6, 0, 0, 0); await book(2, f2, 3, 'Approved', uid[4])
console.log(`Seeded demo data (${k} past bookings). Demo logins: admin@acrep.demo, owner1@acrep.demo, owner2@acrep.demo, borrower1@acrep.demo, borrower2@acrep.demo  password: ${PW}`)
await pool.end()
