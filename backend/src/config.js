import 'dotenv/config'
const need = (k) => { if (!process.env[k]) throw new Error(`Missing env var ${k} (see .env.example)`); return process.env[k] }
export const config = {
  port: Number(process.env.PORT) || 5000,
  jwtSecret: need('JWT_SECRET'),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  db: { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306, user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'acrep' },
  ai: { baseUrl: process.env.AI_BASE_URL || '', apiKey: process.env.AI_API_KEY || '', model: process.env.AI_MODEL || '' },
}
