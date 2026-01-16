'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

export interface LoadingToastProps {
  id: string
  title: string
  description?: string
  onComplete?: () => void
  onDismiss: (id: string) => void
  /** Duration in ms for the progress bar (default 2000) */
  duration?: number
}

export function LoadingToast({
  id,
  title,
  description,
  onComplete,
  onDismiss,
  duration = 2000,
}: LoadingToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const startTimeRef = useRef<number>(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true)
    })

    startTimeRef.current = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current
      const newProgress = Math.min((elapsed / duration) * 100, 100)
      setProgress(newProgress)

      if (newProgress < 100) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Complete
        setTimeout(() => {
          onComplete?.()
          onDismiss(id)
        }, 200)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [id, duration, onComplete, onDismiss])

  return (
    <div
      className={`
        flex flex-col w-[280px] rounded-lg border shadow-lg overflow-hidden
        bg-background border-border
        transition-all duration-150 ease-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="shrink-0">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
