import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { api, tokenStore } from '../lib/api'
import type { User } from '../lib/types'
interface AuthCtx { user: User | null; loading: boolean; isOwner: boolean; isBorrower: boolean; isAdmin: boolean; login: (e: string, p: string) => Promise<void>; register: (b: Record<string, unknown>) => Promise<void>; logout: () => void; setUser: (u: User) => void }
const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(!!tokenStore.get())
  const logout = useCallback(() => { tokenStore.clear(); setUser(null) }, [])
  useEffect(() => { if (tokenStore.get()) api.get<{ user: User }>('/auth/me').then((d) => setUser(d.user)).catch(() => tokenStore.clear()).finally(() => setLoading(false)) }, [])
  useEffect(() => { window.addEventListener('acrep:unauthorized', logout); return () => window.removeEventListener('acrep:unauthorized', logout) }, [logout])
  const accept = (d: { token: string; user: User }) => { tokenStore.set(d.token); setUser(d.user) }
  const login = async (email: string, password: string) => accept(await api.post('/auth/login', { email, password }))
  const register = async (b: Record<string, unknown>) => accept(await api.post('/auth/register', b))
  const t = user?.account_type
  return <Ctx.Provider value={{ user, loading, isOwner: t === 'Owner' || t === 'Both', isBorrower: t === 'Borrower' || t === 'Both', isAdmin: user?.role === 'admin', login, register, logout, setUser }}>{children}</Ctx.Provider>
}
