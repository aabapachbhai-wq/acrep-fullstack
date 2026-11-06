import { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2, Inbox, AlertTriangle } from 'lucide-react'
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'danger' | 'ghost'; busy?: boolean }
export function Button({ variant = 'primary', busy, className = '', children, disabled, ...p }: BtnProps) {
  const v = { primary: 'bg-teal-700 text-white hover:bg-teal-800', outline: 'border border-slate-300 bg-white hover:bg-slate-50', danger: 'bg-red-600 text-white hover:bg-red-700', ghost: 'hover:bg-slate-100' }[variant]
  return <button {...p} disabled={disabled || busy} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 ${v} ${className}`}>{busy && <Loader2 size={14} className="animate-spin" />}{children}</button>
}
export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`rounded-xl border border-slate-200 bg-white p-5 ${className}`}>{children}</div>
export const Spinner = () => <div className="flex justify-center py-16" role="status" aria-label="Loading"><Loader2 className="animate-spin text-teal-700" /></div>
export const Empty = ({ text, action }: { text: string; action?: ReactNode }) => <div className="flex flex-col items-center gap-2 py-14 text-center text-slate-500"><Inbox />{text}{action}</div>
export const ErrorState = ({ text, retry }: { text: string; retry?: () => void }) => <div className="flex flex-col items-center gap-2 py-14 text-center text-red-600"><AlertTriangle /><p>{text}</p>{retry && <Button variant="outline" onClick={retry}>Try again</Button>}</div>
const TONES: Record<string, string> = { Available: 'bg-teal-50 text-teal-800', Approved: 'bg-teal-50 text-teal-800', Completed: 'bg-slate-100 text-slate-700', Paid: 'bg-teal-50 text-teal-800', Booked: 'bg-amber-50 text-amber-800', Pending: 'bg-amber-50 text-amber-800', Unavailable: 'bg-slate-100 text-slate-600', Rejected: 'bg-red-50 text-red-700', Cancelled: 'bg-red-50 text-red-700', Failed: 'bg-red-50 text-red-700', demo: 'bg-violet-50 text-violet-700' }
export const Badge = ({ children, tone }: { children: ReactNode; tone?: string }) => <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone ?? String(children)] ?? 'bg-slate-100 text-slate-700'}`}>{children}</span>
export const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600'
export const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => <label className="block text-sm"><span className="mb-1 block font-medium text-slate-700">{label}</span>{children}{error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}</label>
export const StatCard = ({ label, value }: { label: string; value: ReactNode }) => <Card><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></Card>
export const PageTitle = ({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) => <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>{action}</div>
export const DemoBanner = ({ text }: { text: string }) => <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-800">{text}</div>
export function Confirm({ open, title, message, onConfirm, onCancel }: { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null
  return <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}><Card className="w-full max-w-sm"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600">{message}</p><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button variant="danger" onClick={onConfirm}>Confirm</Button></div></Card></div>
}
export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={title}><Card className="w-full max-w-md"><div className="mb-3 flex justify-between"><h2 className="font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="text-slate-500">✕</button></div>{children}</Card></div>
}
