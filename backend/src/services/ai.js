import { config } from '../config.js'
export const aiEnabled = () => !!(config.ai.baseUrl && config.ai.apiKey && config.ai.model)
// Optional: turns a natural-language request into filters via an OpenAI-compatible API. Returns null if unconfigured or on any failure.
export async function parseSearchQuery(text, categories) {
  if (!aiEnabled() || !text) return null
  try {
    const res = await fetch(`${config.ai.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.ai.apiKey}` },
      body: JSON.stringify({ model: config.ai.model, temperature: 0, messages: [
        { role: 'system', content: `Extract search filters for a community resource marketplace. Reply with JSON only: {"category": one of ${JSON.stringify(categories)} or null, "max_price": number or null, "keywords": string[]}.` },
        { role: 'user', content: String(text).slice(0, 300) }] }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const content = (await res.json()).choices?.[0]?.message?.content || ''
    const p = JSON.parse(content.replace(/```json|```/g, '').trim())
    return { category: categories.includes(p.category) ? p.category : null, max_price: Number.isFinite(p.max_price) ? p.max_price : null, keywords: Array.isArray(p.keywords) ? p.keywords.filter((k) => typeof k === 'string').slice(0, 6) : [] }
  } catch { return null }
}
