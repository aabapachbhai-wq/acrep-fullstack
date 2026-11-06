import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { useToast } from '../context/Toast'
import { ApiError } from '../lib/api'
import { Button, Card, Field, inputCls } from '../components/ui'
const Shell = ({ title, children }: { title: string; children: React.ReactNode }) => <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><Card className="w-full max-w-md"><Link to="/" className="mb-3 flex items-center gap-2 font-bold text-teal-800"><Zap size={18} />ACREP</Link><h1 className="mb-4 text-xl font-semibold">{title}</h1>{children}</Card></div>
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function Login() {
  const { login } = useAuth(); const nav = useNavigate(); const toast = useToast()
  const [f, setF] = useState({ email: '', password: '' }); const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {}
    if (!emailOk.test(f.email)) er.email = 'Enter a valid email'; if (!f.password) er.password = 'Password is required'
    setErrs(er); if (Object.keys(er).length) return
    setBusy(true); try { await login(f.email, f.password); nav('/dashboard') } catch (x) { toast((x as Error).message, 'error') } finally { setBusy(false) }
  }
  const demo = import.meta.env.VITE_DEMO_HINTS === 'true'
  return (
    <Shell title="Welcome back"><form onSubmit={submit} noValidate className="space-y-3">
      <Field label="Email" error={errs.email}><input className={inputCls} type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Password" error={errs.password}><input className={inputCls} type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
      <Button className="w-full" busy={busy}>Log in</Button>
      {demo && <div className="rounded-lg bg-violet-50 p-3 text-xs text-violet-800"><p className="mb-1 font-medium">Demo accounts (sample data only)</p>
        {[['owner1@acrep.demo', 'Owner'], ['borrower1@acrep.demo', 'Borrower'], ['owner2@acrep.demo', 'Both'], ['admin@acrep.demo', 'Admin']].map(([em, l]) => <button key={em} type="button" className="mr-2 underline" onClick={() => setF({ email: em, password: import.meta.env.VITE_DEMO_PASSWORD || '' })}>{l}</button>)}</div>}
      <p className="text-center text-sm text-slate-500">New here? <Link className="text-teal-700" to="/register">Create an account</Link></p></form></Shell>)
}
export function Register() {
  const { register } = useAuth(); const nav = useNavigate(); const toast = useToast()
  const [f, setF] = useState({ full_name: '', email: '', phone: '', password: '', address: '', city: '', pincode: '', account_type: 'Borrower' })
  const [errs, setErrs] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => {
    e.preventDefault(); const er: Record<string, string> = {}
    if (f.full_name.trim().length < 2) er.full_name = 'Enter your full name'; if (!emailOk.test(f.email)) er.email = 'Enter a valid email'
    if (!/^\d{10}$/.test(f.phone)) er.phone = 'Enter a 10-digit phone number'; if (f.password.length < 8) er.password = 'At least 8 characters'
    if (!f.city.trim()) er.city = 'City is required'; if (!/^\d{6}$/.test(f.pincode)) er.pincode = 'Enter a 6-digit pincode'
    setErrs(er); if (Object.keys(er).length) return
    setBusy(true)
    try { await register(f); toast('Account created', 'success'); nav('/dashboard') } catch (x) { if (x instanceof ApiError && x.details) setErrs(x.details); toast((x as Error).message, 'error') } finally { setBusy(false) }
  }
  return (
    <Shell title="Create your account"><form onSubmit={submit} noValidate className="space-y-3">
      <Field label="Full name" error={errs.full_name}><input className={inputCls} value={f.full_name} onChange={set('full_name')} /></Field>
      <Field label="Email" error={errs.email}><input className={inputCls} type="email" value={f.email} onChange={set('email')} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Phone" error={errs.phone}><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Password" error={errs.password}><input className={inputCls} type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field></div>
      <Field label="Address" error={errs.address}><input className={inputCls} value={f.address} onChange={set('address')} /></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="City" error={errs.city}><input className={inputCls} value={f.city} onChange={set('city')} /></Field><Field label="Pincode" error={errs.pincode}><input className={inputCls} value={f.pincode} onChange={set('pincode')} /></Field></div>
      <Field label="Account type"><select className={inputCls} value={f.account_type} onChange={set('account_type')}><option>Borrower</option><option>Owner</option><option>Both</option></select></Field>
      <Button className="w-full" busy={busy}>Create account</Button>
      <p className="text-center text-sm text-slate-500">Already registered? <Link className="text-teal-700" to="/login">Log in</Link></p></form></Shell>)
}
