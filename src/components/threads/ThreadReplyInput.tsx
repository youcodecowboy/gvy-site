'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { Send, X } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface ThreadReplyInputProps {
  threadId: Id<'threads'>
  parentReplyId?: Id<'threadReplies'>
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export function ThreadReplyInput({
  threadId,
  parentReplyId,
  onSuccess,
  onCancel,
  placeholder = 'Write a reply...',
  autoFocus = false,
}: ThreadReplyInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const createReply = useMutation(api.threads.createReply)

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await createReply({
        threadId,
        parentReplyId,
        content: content.trim(),
      })
      setContent('')
      onSuccess?.()
    } catch (error) {
      console.error('Failed to create reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    // Cancel on Escape
    if (e.key === 'Escape' && onCancel) {
      onCancel()
    }
  }

  return (
    <div className="thread-reply-input">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="thread-reply-textarea"
        rows={1}
        disabled={isSubmitting}
      />
      <div className="thread-reply-input-actions">
        {onCancel && (
          <button
            onClick={onCancel}
            className="thread-reply-cancel-btn"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="thread-reply-submit-btn"
          title="Send reply (Cmd+Enter)"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
