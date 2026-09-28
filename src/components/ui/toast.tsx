'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Toast notifications rendered into a single polite live region so screen
 * readers announce updates without stealing focus. Auto-dismiss is paused for
 * errors, and every toast can be dismissed by keyboard.
 */

type ToastTone = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const ICONS = { success: CircleCheck, error: CircleAlert, warning: TriangleAlert, info: Info } as const

const TONES: Record<ToastTone, string> = {
  success: 'border-success-500/40 bg-success-50 text-success-700',
  error: 'border-danger-500/40 bg-danger-50 text-danger-700',
  warning: 'border-warning-500/45 bg-warning-50 text-warning-700',
  info: 'border-brand-300 bg-brand-50 text-brand-900',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback<ToastContextValue['toast']>(({ title, description, tone = 'info' }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((current) => [...current.slice(-3), { id, title, description, tone }])
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-sm">
          {toasts.map((item) => (
            <ToastCard key={item.id} toast={item} onDismiss={() => remove(item.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.tone]

  useEffect(() => {
    if (toast.tone === 'error') return // errors persist until dismissed
    const timer = setTimeout(onDismiss, 6000)
    return () => clearTimeout(timer)
  }, [toast.tone, onDismiss])

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-3.5 shadow-[var(--shadow-elevate)] animate-slide-up',
        TONES[toast.tone],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.description ? <p className="text-xs leading-relaxed opacity-90">{toast.description}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="-m-1 rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-current"
        aria-label={`Dismiss notification: ${toast.title}`}
      >
        <X className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    // Non-fatal: components stay usable even outside the provider (e.g. in tests).
    return { toast: () => {} } satisfies ToastContextValue
  }
  return context
}
