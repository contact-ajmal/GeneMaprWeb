import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    borderColor: 'border-l-[#00ff88]',
    glowColor: 'shadow-[0_0_15px_rgba(0,255,136,0.15)]',
    iconColor: 'text-[#00ff88]',
    progressColor: 'bg-[#00ff88]',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-l-[#ff3366]',
    glowColor: 'shadow-[0_0_15px_rgba(255,51,102,0.15)]',
    iconColor: 'text-[#ff3366]',
    progressColor: 'bg-[#ff3366]',
  },
  info: {
    icon: Info,
    borderColor: 'border-l-[#00d4ff]',
    glowColor: 'shadow-[0_0_15px_rgba(0,212,255,0.15)]',
    iconColor: 'text-[#00d4ff]',
    progressColor: 'bg-[#00d4ff]',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-l-[#ffaa00]',
    glowColor: 'shadow-[0_0_15px_rgba(255,170,0,0.15)]',
    iconColor: 'text-[#ffaa00]',
    progressColor: 'bg-[#ffaa00]',
  },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const config = variantConfig[toast.variant]
  const Icon = config.icon
  const duration = toast.duration || 4000

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), duration)
    return () => clearTimeout(timer)
  }, [toast.id, duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        relative overflow-hidden rounded-xl border-l-4
        ${config.borderColor} ${config.glowColor}
        backdrop-blur-xl
      `}
      style={{
        background: 'rgba(20, 27, 45, 0.85)',
        border: '1px solid rgba(0, 212, 255, 0.1)',
        borderLeftWidth: '4px',
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
        <p className="text-sm text-slate-200 font-body flex-1">{toast.message}</p>
        <button
          onClick={() => onDismiss(toast.id)}
          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <motion.div
        className={`absolute bottom-0 left-0 h-0.5 ${config.progressColor}`}
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        style={{ opacity: 0.6 }}
      />
    </motion.div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info', duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, message, variant, duration }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed top-20 right-6 z-[100] flex flex-col gap-3 w-80 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
