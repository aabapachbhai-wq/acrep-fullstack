import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
type Kind = 'success' | 'error' | 'info'
const Ctx = createContext<(m: string, k?: Kind) => void>(() => {})
export const useToast = () => useContext(Ctx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; m: string; k: Kind }[]>([])
  const push = useCallback((m: string, k: Kind = 'info') => { const id = Date.now() + Math.random(); setItems((i) => [...i, { id, m, k }]); setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 4500) }, [])
  const tone = { success: 'bg-teal-700', error: 'bg-red-600', info: 'bg-slate-800' }
  return <Ctx.Provider value={push}>{children}<div className="fixed bottom-4 right-4 z-[2000] space-y-2" role="status" aria-live="polite">{items.map((t) => <div key={t.id} className={`rounded-lg px-4 py-3 text-sm text-white shadow-lg ${tone[t.k]}`}>{t.m}</div>)}</div></Ctx.Provider>
}
