'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { type Editor } from '@tiptap/react'
import { MessageSquare, Send, X, Check, Trash2 } from 'lucide-react'
import { useTiptapUser } from '@/contexts/user-context'

interface Comment {
  id: string
  content: string
  data?: {
    authorId?: string
    authorName?: string
    authorColor?: string
    createdAt?: number
  }
}

interface Thread {
  id: string
  comments: Comment[]
  resolvedAt?: number
  data?: Record<string, any>
}

interface ThreadPopoverProps {
  editor: Editor
  thread: Thread | null
  onClose: () => void
  position: { top: number; left: number } | null
  provider: any
}

export function ThreadPopover({ editor, thread, onClose, position, provider }: ThreadPopoverProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { user } = useTiptapUser()

  useEffect(() => {
    if (thread && inputRef.current) {
      inputRef.current.focus()
    }
  }, [thread])

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
    if (!newComment.trim() || !thread || !provider) return

    setIsSubmitting(true)
    try {
      await provider.createComment({
        threadId: thread.id,
        content: newComment.trim(),
        data: {
          authorId: user.id,
          authorName: user.name,
          authorColor: user.color,
          createdAt: Date.now(),
        },
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to create comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [newComment, thread, provider, user])

  const handleResolve = useCallback(() => {
    if (!thread || !provider) return
    provider.resolveThread(thread.id)
    onClose()
  }, [thread, provider, onClose])

  const handleDelete = useCallback(() => {
    if (!thread || !editor) return
    editor.commands.removeThread({ id: thread.id, deleteThread: true })
    onClose()
  }, [thread, editor, onClose])

  if (!thread || !position) return null

  const comments = thread.comments || []
  const isResolved = !!thread.resolvedAt

  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg w-80 max-h-96 overflow-hidden flex flex-col"
      style={{
        top: position.top,
        left: Math.max(16, Math.min(position.left, typeof window !== 'undefined' ? window.innerWidth - 340 : position.left)),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {comments.length === 0 ? 'New Comment' : `${comments.length} comment${comments.length !== 1 ? 's' : ''}`}
          </span>
          {isResolved && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Resolved</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isResolved && comments.length > 0 && (
            <button
              onClick={handleResolve}
              className="p-1 hover:bg-accent rounded transition-colors"
              title="Resolve thread"
            >
              <Check className="h-4 w-4 text-green-600" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-accent rounded transition-colors"
            title="Delete thread"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-48">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white flex-shrink-0"
                style={{ backgroundColor: comment.data?.authorColor || '#888' }}
              >
                {(comment.data?.authorName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.data?.authorName || 'Unknown'}</span>
                  {comment.data?.createdAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.data.createdAt)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      {!isResolved && (
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder={comments.length === 0 ? 'Add a comment...' : 'Reply...'}
              className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            />
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Portal to body to escape any container positioning
  if (typeof document !== 'undefined') {
    return createPortal(popoverContent, document.body)
  }

  return popoverContent
}

function formatTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  
  return new Date(timestamp).toLocaleDateString()
}

// Component to create a new comment thread
interface NewThreadPopoverProps {
  editor: Editor
  onClose: () => void
  position: { top: number; left: number } | null
}

export function NewThreadPopover({ editor, onClose, position }: NewThreadPopoverProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const { user } = useTiptapUser()

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

  const handleSubmit = useCallback(() => {
    if (!comment.trim() || !editor) return

    setIsSubmitting(true)
    try {
      editor.commands.setThread({
        content: comment.trim(),
        data: {
          authorId: user.id,
          authorName: user.name,
          authorColor: user.color,
          createdAt: Date.now(),
        },
        commentData: {
          authorId: user.id,
          authorName: user.name,
          authorColor: user.color,
          createdAt: Date.now(),
        },
      })
      onClose()
    } catch (error) {
      console.error('Failed to create thread:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [comment, editor, user, onClose])

  if (!position) return null

  // Use portal to render at document root to avoid positioning issues
  const popoverContent = (
    <div
      ref={popoverRef}
      className="fixed z-[9999] bg-background border border-border rounded-lg shadow-lg w-72 overflow-hidden"
      style={{
        top: position.top,
        left: Math.max(16, Math.min(position.left, window.innerWidth - 300)),
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Add Comment</span>
        <button
          onClick={onClose}
          className="ml-auto p-1 hover:bg-accent rounded transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          />
          <button
            onClick={handleSubmit}
            disabled={!comment.trim() || isSubmitting}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
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
