import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { errorHandler, HttpError } from './lib/http.js'
import auth from './routes/auth.js'
import categories from './routes/categories.js'
import resources from './routes/resources.js'
import bookings from './routes/bookings.js'
import payments from './routes/payments.js'
import reviews from './routes/reviews.js'
import notifications from './routes/notifications.js'
import favourites from './routes/favourites.js'
import reports from './routes/reports.js'
import analytics from './routes/analytics.js'
import admin from './routes/admin.js'
const app = express()
app.use(cors({ origin: config.corsOrigin }))
app.use(express.json({ limit: '100kb' }))
app.get('/api/health', (_q, r) => r.json({ ok: true }))
app.use('/api/auth', auth); app.use('/api/categories', categories); app.use('/api/resources', resources)
app.use('/api/bookings', bookings); app.use('/api/payments', payments); app.use('/api/reviews', reviews)
app.use('/api/notifications', notifications); app.use('/api/favourites', favourites); app.use('/api/reports', reports)
app.use('/api/analytics', analytics); app.use('/api/admin', admin)
app.use((_q, _r, next) => next(new HttpError(404, 'Not found')))
app.use(errorHandler)
app.listen(config.port, () => console.log(`ACREP API listening on :${config.port}`))
