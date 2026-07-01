import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export const useToast = () => useContext(ToastContext)

const VALID_TYPES: ToastType[] = ['success', 'error', 'info']

const ICONS: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  info: 'ℹ️'
}

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: 'var(--success-bg)', border: 'var(--success)', text: 'var(--success)' },
  error: { bg: 'var(--danger-bg)', border: 'var(--danger)', text: 'var(--danger)' },
  info: { bg: 'var(--accent-bg)', border: 'var(--accent)', text: 'var(--accent)' }
}

function validateType(type: string): ToastType {
  return VALID_TYPES.includes(type as ToastType) ? (type as ToastType) : 'info'
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current.clear()
    }
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const safeType = validateType(type)
    const id = nextId.current++
    setToasts(prev => [...prev, { id, type: safeType, message }])
    const timer = setTimeout(() => {
      timersRef.current.delete(id)
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
    timersRef.current.set(id, timer)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] space-y-2" role="region" aria-label="通知">
        {toasts.slice(-3).map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm shadow-lg border animate-fade-in-up"
            style={{
              backgroundColor: COLORS[toast.type].bg,
              borderColor: COLORS[toast.type].border,
              color: COLORS[toast.type].text
            }}
            role="alert"
            aria-live="polite"
          >
            <span aria-hidden="true">{ICONS[toast.type]}</span>
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="ml-2 opacity-50 hover:opacity-100"
              aria-label="关闭通知"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
