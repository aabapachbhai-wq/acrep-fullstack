import { Routes, Route, Link } from 'react-router-dom'
import Layout, { Protected } from './components/Layout'
import Landing from './pages/Landing'
import { Login, Register } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import MapPage from './pages/MapPage'
import ResourceDetail from './pages/ResourceDetail'
import ResourceForm from './pages/ResourceForm'
import MyResources from './pages/MyResources'
import Checkout from './pages/Checkout'
import MyBookings from './pages/MyBookings'
import OwnerBookings from './pages/OwnerBookings'
import Recommendations from './pages/Recommendations'
import Analytics from './pages/Analytics'
import Notifications from './pages/Notifications'
import Favourites from './pages/Favourites'
import Profile from './pages/Profile'
import Payments from './pages/Payments'
import Admin from './pages/Admin'
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route path="/explore" element={<Explore />} /><Route path="/map" element={<MapPage />} /><Route path="/resources/:id" element={<ResourceDetail />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/resources/new" element={<Protected need="owner"><ResourceForm /></Protected>} />
        <Route path="/resources/:id/edit" element={<Protected need="owner"><ResourceForm /></Protected>} />
        <Route path="/my-resources" element={<Protected need="owner"><MyResources /></Protected>} />
        <Route path="/bookings" element={<Protected need="borrower"><MyBookings /></Protected>} />
        <Route path="/bookings/:id/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/owner/bookings" element={<Protected need="owner"><OwnerBookings /></Protected>} />
        <Route path="/recommendations" element={<Protected><Recommendations /></Protected>} />
        <Route path="/analytics" element={<Protected><Analytics /></Protected>} />
        <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
        <Route path="/favourites" element={<Protected><Favourites /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/payments" element={<Protected><Payments /></Protected>} />
        <Route path="/admin" element={<Protected need="admin"><Admin /></Protected>} />
        <Route path="*" element={<div className="py-20 text-center"><h1 className="text-3xl font-semibold">404</h1><p className="mb-4 text-slate-500">Page not found.</p><Link className="text-teal-700" to="/">Go home</Link></div>} />
      </Route>
    </Routes>)
}
