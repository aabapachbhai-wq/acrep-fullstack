export class HttpError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details } }
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) return res.status(err.status).json({ error: { message: err.message, details: err.details } })
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: { message: 'Invalid JSON body' } })
  console.error(err)
  res.status(500).json({ error: { message: 'Internal server error' } })
}
// Minimal schema validator: returns cleaned values or throws 400 with per-field details.
export function validate(body, schema) {
  const errors = {}, out = {}
  for (const [k, rule] of Object.entries(schema)) {
    let v = body?.[k]
    if (v === undefined || v === null || v === '') { if (rule.required) errors[k] = 'Required'; else if (rule.default !== undefined) out[k] = rule.default; continue }
    if (rule.type === 'number') {
      v = Number(v)
      if (!Number.isFinite(v)) { errors[k] = 'Must be a number'; continue }
      if (rule.min !== undefined && v < rule.min) { errors[k] = `Must be at least ${rule.min}`; continue }
      if (rule.max !== undefined && v > rule.max) { errors[k] = `Must be at most ${rule.max}`; continue }
      if (rule.int && !Number.isInteger(v)) { errors[k] = 'Must be a whole number'; continue }
    } else {
      v = String(v).trim()
      if (rule.min && v.length < rule.min) { errors[k] = `At least ${rule.min} characters`; continue }
      if (rule.max && v.length > rule.max) { errors[k] = `At most ${rule.max} characters`; continue }
      if (rule.pattern && !rule.pattern.test(v)) { errors[k] = rule.message || 'Invalid format'; continue }
      if (rule.enum && !rule.enum.includes(v)) { errors[k] = `Must be one of: ${rule.enum.join(', ')}`; continue }
    }
    out[k] = v
  }
  if (Object.keys(errors).length) throw new HttpError(400, 'Validation failed', errors)
  return out
}
