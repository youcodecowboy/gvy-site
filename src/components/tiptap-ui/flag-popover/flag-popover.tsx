'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Flag, Send, X, Loader2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { MemberSelector, type Member } from './member-selector'

interface FlagPopoverProps {
  docId: string
  type: 'inline' | 'document'
  selectionData?: {
    from: number
    to: number
    selectedText: string
  }
  position: { top: number; left: number } | null
  onClose: () => void
  onSuccess?: () => void
}

export function FlagPopover({
  docId,
  type,
  selectionData,
  position,
  onClose,
  onSuccess,
}: FlagPopoverProps) {
  const [message, setMessage] = useState('')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useUser()

  const createFlag = useMutation(api.flags.createFlag)

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
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
    if (!message.trim() || !selectedMember) {
      setError('Please select a recipient and enter a message')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createFlag({
        docId: docId as Id<'nodes'>,
        type,
        selectionData: type === 'inline' ? selectionData : undefined,
        recipientId: selectedMember.id,
        recipientName: selectedMember.name,
        message: message.trim(),
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      console.error('Failed to create flag:', err)
      setError(err instanceof Error ? err.message : 'Failed to send flag')
    } finally {
      setIsSubmitting(false)
    }
  }, [message, selectedMember, createFlag, docId, type, selectionData, onSuccess, onClose])

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
        <Flag className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">
          {type === 'inline' ? 'Flag Selection' : 'Flag Document'}
        </span>
        <button
          onClick={onClose}
          className="ml-auto p-1 hover:bg-accent rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Selected text preview for inline flags */}
        {type === 'inline' && selectionData?.selectedText && (
          <div className="bg-muted/50 rounded-md p-2 border-l-2 border-orange-500">
            <p className="text-xs text-muted-foreground mb-1">Selected text:</p>
            <p className="text-sm line-clamp-2 italic">
              "{selectionData.selectedText.length > 100
                ? selectionData.selectedText.slice(0, 100) + '...'
                : selectionData.selectedText}"
            </p>
          </div>
        )}

        {/* Member selector */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Send to:
          </label>
          <MemberSelector
            selectedMember={selectedMember}
            onSelect={setSelectedMember}
            excludeUserId={user?.id}
          />
        </div>

        {/* Message input */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">
            Message:
          </label>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.metaKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Why are you flagging this?"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
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
            disabled={!message.trim() || !selectedMember || isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Flag</span>
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
