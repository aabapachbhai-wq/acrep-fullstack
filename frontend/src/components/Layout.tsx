import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { Bell, CalendarCheck, CreditCard, Heart, LayoutDashboard, LogOut, Map, Menu, PackagePlus, Search, Shield, Sparkles, TrendingUp, User as UserIcon, Boxes, Inbox, Zap, X } from 'lucide-react'
import { useAuth } from '../context/Auth'
import { api } from '../lib/api'
import { Spinner } from './ui'
export function Protected({ children, need }: { children: JSX.Element; need?: 'owner' | 'borrower' | 'admin' }) {
  const { user, loading, isOwner, isBorrower, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if ((need === 'owner' && !isOwner) || (need === 'borrower' && !isBorrower) || (need === 'admin' && !isAdmin)) return <div className="py-20 text-center"><h1 className="text-xl font-semibold">Not authorised</h1><p className="text-slate-500">Your account type doesn't have access to this page.</p></div>
  return children
}
export default function Layout() {
  const { user, isOwner, isBorrower, isAdmin, logout } = useAuth(); const nav = useNavigate(); const [open, setOpen] = useState(false); const [unread, setUnread] = useState(0)
  useEffect(() => { if (!user) return setUnread(0); const poll = () => api.get<{ unread: number }>('/notifications/unread-count').then((d) => setUnread(d.unread)).catch(() => {}); poll(); const t = setInterval(poll, 30000); return () => clearInterval(t) }, [user])
  const items: [string, string, typeof Search, boolean][] = [
    ['/dashboard', 'Dashboard', LayoutDashboard, !!user], ['/explore', 'Explore', Search, true], ['/map', 'Map', Map, true], ['/recommendations', 'Recommendations', Sparkles, !!user],
    ['/favourites', 'Favourites', Heart, !!user], ['/bookings', 'My bookings', CalendarCheck, !!user && isBorrower], ['/my-resources', 'My resources', Boxes, !!user && isOwner],
    ['/owner/bookings', 'Booking requests', Inbox, !!user && isOwner], ['/resources/new', 'Add resource', PackagePlus, !!user && isOwner], ['/analytics', 'Demand analytics', TrendingUp, !!user],
    ['/payments', 'Payments', CreditCard, !!user], ['/notifications', 'Notifications', Bell, !!user], ['/profile', 'Profile', UserIcon, !!user], ['/admin', 'Admin', Shield, isAdmin]]
  const sidebar = (
    <nav className="flex flex-col gap-0.5 p-3" onClick={() => setOpen(false)}>
      {items.filter((i) => i[3]).map(([to, label, Icon]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-teal-50 font-medium text-teal-800' : 'text-slate-600 hover:bg-slate-100'}`}>
          <Icon size={16} />{label}{to === '/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-teal-700 px-1.5 text-xs text-white">{unread}</span>}
        </NavLink>))}
      {user ? <button onClick={() => { logout(); nav('/') }} className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"><LogOut size={16} />Log out</button>
        : <div className="mt-3 flex gap-2 px-1"><Link to="/login" className="flex-1 rounded-lg border py-2 text-center text-sm">Log in</Link><Link to="/register" className="flex-1 rounded-lg bg-teal-700 py-2 text-center text-sm text-white">Sign up</Link></div>}
    </nav>)
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block"><Link to="/" className="flex items-center gap-2 p-5 text-lg font-bold text-teal-800"><Zap size={20} />ACREP</Link>{sidebar}</aside>
      <header className="sticky top-0 z-[1000] flex items-center justify-between border-b bg-white px-4 py-3 md:hidden"><Link to="/" className="flex items-center gap-2 font-bold text-teal-800"><Zap size={18} />ACREP</Link><button aria-label="Menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></header>
      {open && <div className="fixed inset-x-0 top-[53px] z-[1000] max-h-[80vh] overflow-auto border-b bg-white shadow md:hidden">{sidebar}</div>}
      <main className="min-w-0 flex-1 p-4 md:p-8"><Outlet /></main>
    </div>)
}
