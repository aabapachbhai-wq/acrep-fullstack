export async function notify(db, userId, type, message, link = null) {
  await db.query('INSERT INTO notifications (user_id, type, message, link) VALUES (?,?,?,?)', [userId, type, String(message).slice(0, 255), link])
}
