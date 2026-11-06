import { Link } from 'react-router-dom'
import { BatteryCharging, ParkingSquare, Wrench, WashingMachine, Printer, Sun, Search, CalendarCheck, Handshake, Zap, Sparkles, ShieldCheck } from 'lucide-react'
const cats = [[BatteryCharging, 'EV Chargers'], [ParkingSquare, 'Parking'], [Wrench, 'Power Tools'], [WashingMachine, 'Washing Machines'], [Printer, 'Printers'], [Sun, 'Solar Energy']] as const
export default function Landing() {
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><span className="flex items-center gap-2 text-lg font-bold text-teal-800"><Zap size={20} />ACREP</span>
        <nav className="flex items-center gap-4 text-sm"><Link to="/explore">Explore</Link><Link to="/map">Map</Link><Link to="/login">Log in</Link><Link to="/register" className="rounded-lg bg-teal-700 px-3.5 py-2 text-white">Sign up</Link></nav></header>
      <section className="bg-gradient-to-b from-teal-50 to-white px-5 py-20 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">Share what you don't use. Find what you need — nearby.</h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600">ACREP is a community marketplace for under-used resources: EV chargers, parking, tools, appliances and more.</p>
        <div className="mt-8 flex justify-center gap-3"><Link to="/explore" className="rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white">Explore resources</Link><Link to="/register" className="rounded-lg border border-teal-700 px-5 py-2.5 font-medium text-teal-800">Start sharing</Link></div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14"><h2 className="mb-6 text-xl font-semibold">Browse by category</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">{cats.map(([I, n]) => <Link key={n} to="/explore" className="flex flex-col items-center gap-2 rounded-xl border bg-white p-5 text-center text-sm transition hover:border-teal-600 hover:shadow"><I className="text-teal-700" />{n}</Link>)}</div></section>
      <section className="mx-auto max-w-6xl px-5 pb-14"><h2 className="mb-6 text-xl font-semibold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">{[[Search, 'Discover', 'Search, filter and explore listings on the map.'], [CalendarCheck, 'Request', 'Pick a time slot; the owner approves or declines.'], [Handshake, 'Share', 'Owners earn from idle resources; borrowers save.']].map(([I, t, d], i) => { const Icon = I as typeof Search; return <div key={i} className="rounded-xl border bg-white p-5"><Icon className="text-teal-700" /><h3 className="mt-2 font-semibold">{t as string}</h3><p className="text-sm text-slate-600">{d as string}</p></div> })}</div></section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-14 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5"><Sparkles className="text-teal-700" /><h3 className="mt-2 font-semibold">Transparent recommendations</h3><p className="text-sm text-slate-600">Rankings use a local scoring engine (distance, price, availability, your history) and always explain why. An external AI is used only if configured.</p></div>
        <div className="rounded-xl border bg-white p-5"><ShieldCheck className="text-teal-700" /><h3 className="mt-2 font-semibold">Trust & honesty</h3><p className="text-sm text-slate-600">Reviews come only from completed bookings. Payments in this prototype are simulated — no real money moves.</p></div></section>
      <footer className="border-t py-6 text-center text-xs text-slate-500">ACREP prototype · sample listings are labelled “Demo data”</footer>
    </div>)
}
