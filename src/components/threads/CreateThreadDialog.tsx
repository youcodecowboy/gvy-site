'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquarePlus, Send, X, Loader2, Link2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface CreateThreadDialogProps {
  docId: string
  orgId?: string
  selectionData?: {
    from: number
    to: number
    selectedText: string
  }
  position: { top: number; left: number } | null
  onClose: () => void
  onSuccess?: (threadId: Id<'threads'>) => void
}

export function CreateThreadDialog({
  docId,
  orgId,
  selectionData,
  position,
  onClose,
  onSuccess,
}: CreateThreadDialogProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const createThread = useMutation(api.threads.createThread)

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Please enter a thread title')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const threadId = await createThread({
        docId: docId as Id<'nodes'>,
        title: title.trim(),
        anchorData: selectionData,
        orgId,
      })
      onSuccess?.(threadId)
      onClose()
    } catch (err) {
      console.error('Failed to create thread:', err)
      setError(err instanceof Error ? err.message : 'Failed to create thread')
    } finally {
      setIsSubmitting(false)
    }
  }, [title, createThread, docId, selectionData, orgId, onSuccess, onClose])

  if (!position) return null

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg w-80 overflow-hidden"
      style={{
        top: position.top,
        left: Math.max(16, Math.min(position.left, typeof window !== 'undefined' ? window.innerWidth - 340 : position.left)),
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
        <MessageSquarePlus className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">New Thread</span>
        <button
          onClick={onClose}
          className="ml-auto p-1 hover:bg-accent rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Selected text preview */}
        {selectionData?.selectedText && (
          <div className="bg-muted/50 rounded-md p-2 border-l-2 border-primary">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Link2 className="h-3 w-3" />
              <span>Anchored to:</span>
            </div>
            <p className="text-sm line-clamp-2 italic">
              "{selectionData.selectedText.length > 100
                ? selectionData.selectedText.slice(0, 100) + '...'
                : selectionData.selectedText}"
            </p>
          </div>
        )}

        {/* Title input */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Thread title:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="What's this discussion about?"
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          />
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Create Thread</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // Portal to body to escape any container positioning
  if (typeof document !== 'undefined') {
    return createPortal(popoverContent, document.body)
  }

  return popoverContent
}
