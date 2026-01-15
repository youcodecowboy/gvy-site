'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

export type ToastVariant = 'default' | 'success' | 'error' | 'info'

export interface ToastData {
  id: string
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'bg-background border-border',
  success: 'bg-background border-border',
  error: 'bg-background border-destructive',
  info: 'bg-background border-border',
}

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
}

export function Toast({
  id,
  title,
  description,
  variant = 'default',
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    // Auto dismiss
    const timer = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onDismiss(id), 150)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => onDismiss(id), 150)
  }

  const icon = variantIcons[variant]

  return (
    <div
      className={`
        flex items-start gap-3 w-[320px] p-3 rounded-lg border shadow-lg
        transition-all duration-150 ease-out
        ${variantStyles[variant]}
        ${isVisible && !isLeaving ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
