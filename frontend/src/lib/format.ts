export const inr = (n: number | string) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
export const dt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
// Times are entered in the browser's local zone and sent to the API as UTC ISO strings.
export const toIso = (date: string, time: string) => new Date(`${date}T${time}`).toISOString()
export const hoursBetween = (date: string, s: string, e: string) => (s && e && date ? (new Date(`${date}T${e}`).getTime() - new Date(`${date}T${s}`).getTime()) / 36e5 : 0)
