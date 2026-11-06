import { FormEvent, useState } from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'
import { useAuth } from '../context/Auth'
import { useToast } from '../context/Toast'
import { Badge, Button, Card, Field, PageTitle, inputCls } from '../components/ui'
export default function Profile() {
  const { user, setUser } = useAuth(); const toast = useToast()
  const [f, setF] = useState({ full_name: user?.full_name ?? '', phone: user?.phone ?? '', address: user?.address ?? '', city: user?.city ?? '', pincode: user?.pincode ?? '', account_type: user?.account_type ?? 'Borrower' })
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); setErrs({})
    try { const d = await api.put<{ user: User }>('/auth/me', f); setUser(d.user); toast('Profile updated', 'success') } catch (x) { setErrs((x as { details?: Record<string, string> }).details ?? {}); toast((x as Error).message, 'error') } finally { setBusy(false) } }
  return (
    <div className="max-w-xl"><PageTitle title="Profile" />
      <Card><p className="mb-4 text-sm text-slate-500">{user?.email} {user?.role === 'admin' && <Badge tone="demo">Admin</Badge>}</p>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Full name" error={errs.full_name}><input className={inputCls} value={f.full_name} onChange={set('full_name')} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Phone" error={errs.phone}><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field><Field label="Account type"><select className={inputCls} value={f.account_type} onChange={set('account_type')}><option>Borrower</option><option>Owner</option><option>Both</option></select></Field></div>
          <Field label="Address" error={errs.address}><input className={inputCls} value={f.address} onChange={set('address')} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="City" error={errs.city}><input className={inputCls} value={f.city} onChange={set('city')} /></Field><Field label="Pincode" error={errs.pincode}><input className={inputCls} value={f.pincode} onChange={set('pincode')} /></Field></div>
          <Button busy={busy}>Save changes</Button></form></Card></div>)
}
