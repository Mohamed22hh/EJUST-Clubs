import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    setToasts(prev => {
      // Deduplicate: don't show same message+type if already visible
      if (prev.some(t => t.message === message && t.type === type)) return prev
      // Cap at 5 toasts
      const id = Math.random().toString(36).slice(2)
      const next = [...prev.slice(-4), { id, message, type }]
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
      return next
    })
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium pointer-events-auto
              min-w-[280px] max-w-sm border fade-up
              ${t.type === 'success' ? 'bg-white border-green-200 text-green-800' :
                t.type === 'error' ? 'bg-white border-red-200 text-red-800' :
                'bg-white border-[#e8e8e8] text-[#1c1c1c]'}`}
          >
            {t.type === 'success' && <CheckCircle size={16} className="text-green-600 shrink-0" />}
            {t.type === 'error' && <AlertCircle size={16} className="text-[#C0121F] shrink-0" />}
            {t.type === 'info' && <Info size={16} className="text-blue-600 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-[#999] hover:text-[#555]">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
