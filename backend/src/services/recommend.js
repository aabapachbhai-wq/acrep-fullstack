// Local, rule-based scoring. Reasons are only emitted for factors that actually contributed.
export function scoreResource(r, ctx = {}) {
  let score = 0
  const reasons = []
  const radius = ctx.radiusKm || 15
  if (ctx.categoryId && r.category_id === ctx.categoryId) { score += 30; reasons.push('Matches the category you asked for') }
  else if (ctx.pastCategories?.has(r.category_id)) { score += 15; reasons.push('Same category as one of your previous bookings') }
  if (r.distance_km != null) {
    const d = Number(r.distance_km)
    if (d <= radius) { score += Math.round(30 * (1 - d / radius)); reasons.push(`About ${d.toFixed(1)} km away`) } else score -= 5
  }
  const price = Number(r.price_per_hour)
  if (ctx.maxPrice != null) { if (price <= ctx.maxPrice) { score += 15; reasons.push(`Within your budget (₹${price}/hr)`) } else score -= 20 }
  if (r.availability_status === 'Available') score += 10
  if (ctx.window) { if (r.conflicts) score -= 50; else { score += 15; reasons.push('Free for your selected time') } }
  if (r.review_count >= 3 && r.avg_rating >= 4) { score += 10; reasons.push(`Rated ${Number(r.avg_rating).toFixed(1)}/5 from ${r.review_count} reviews`) }
  if (ctx.keywords?.length) {
    const text = `${r.name} ${r.description}`.toLowerCase()
    if (ctx.keywords.some((k) => text.includes(k))) { score += 20; reasons.push('Matches your keywords') }
  }
  return { score, reasons }
}
