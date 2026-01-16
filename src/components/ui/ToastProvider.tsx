'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Toast, type ToastData, type ToastVariant } from './Toast'
import { LoadingToast, type LoadingToastProps } from './LoadingToast'

interface LoadingToastData {
  id: string
  title: string
  description?: string
  duration?: number
  onComplete?: () => void
}

interface ToastContextValue {
  toast: (options: Omit<ToastData, 'id'>) => void
  loading: (options: Omit<LoadingToastData, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [loadingToasts, setLoadingToasts] = useState<LoadingToastData[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toast = useCallback((options: Omit<ToastData, 'id'>) => {
    const id = `toast-${++toastId}`
    setToasts((prev) => [...prev, { ...options, id }])
  }, [])

  const loading = useCallback((options: Omit<LoadingToastData, 'id'>) => {
    const id = `loading-${++toastId}`
    setLoadingToasts((prev) => [...prev, { ...options, id }])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    setLoadingToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
    setLoadingToasts([])
  }, [])

  return (
    <ToastContext.Provider value={{ toast, loading, dismiss, dismissAll }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
            {loadingToasts.map((t) => (
              <LoadingToast
                key={t.id}
                id={t.id}
                title={t.title}
                description={t.description}
                duration={t.duration}
                onComplete={t.onComplete}
                onDismiss={dismiss}
              />
            ))}
            {toasts.map((t) => (
              <Toast key={t.id} {...t} onDismiss={dismiss} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
