'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import {
  ArrowLeft,
  X,
  Check,
  RotateCcw,
  Link2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ThreadReply } from './ThreadReply'
import { ThreadReplyInput } from './ThreadReplyInput'

interface ThreadViewProps {
  threadId: Id<'threads'>
  onBack?: () => void
  onClose?: () => void
  onAnchorClick?: (anchorData: { from: number; to: number }) => void
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffInMs = now - timestamp
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function ThreadView({
  threadId,
  onBack,
  onClose,
  onAnchorClick,
}: ThreadViewProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Id<'threadReplies'> | null>(null)

  const thread = useQuery(api.threads.getThread, { threadId })
  const resolveThread = useMutation(api.threads.resolveThread)
  const reopenThread = useMutation(api.threads.reopenThread)
  const deleteThread = useMutation(api.threads.deleteThread)

  if (!thread) {
    return (
      <div className="threads-panel">
        <div className="threads-panel-header">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="threads-panel-content">
          <div className="animate-pulse space-y-3 p-4">
            <div className="h-6 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  const isResolved = thread.status === 'resolved'

  const handleResolve = async () => {
    try {
      await resolveThread({ threadId })
    } catch (error) {
      console.error('Failed to resolve thread:', error)
    }
  }

  const handleReopen = async () => {
    try {
      await reopenThread({ threadId })
    } catch (error) {
      console.error('Failed to reopen thread:', error)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this thread? This cannot be undone.')) {
      try {
        await deleteThread({ threadId })
        onBack?.()
      } catch (error) {
        console.error('Failed to delete thread:', error)
      }
    }
  }

  return (
    <div className="threads-panel">
      <div className="threads-panel-header">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="font-medium text-sm truncate">{thread.title}</span>
          {isResolved && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
              Resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Thread actions menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md z-50 py-1 min-w-[140px]">
                  {isResolved ? (
                    <button
                      onClick={() => {
                        handleReopen()
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reopen Thread
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        handleResolve()
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2"
                    >
                      <Check className="h-3 w-3" />
                      Resolve Thread
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete Thread
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="threads-panel-content thread-view-content">
        {/* Thread header info */}
        <div className="thread-view-header">
          <h3 className="thread-view-title">{thread.title}</h3>
          <div className="thread-view-meta">
            <span>Started by @{thread.authorName}</span>
            <span className="thread-separator">·</span>
            <span>{formatRelativeTime(thread.createdAt)}</span>
          </div>

          {/* Anchor preview */}
          {thread.anchorData && (
            <div
              className="thread-anchor-preview mt-2 cursor-pointer"
              onClick={() => onAnchorClick?.(thread.anchorData!)}
            >
              <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="thread-anchor-text">
                "{thread.anchorData.selectedText.length > 100
                  ? thread.anchorData.selectedText.slice(0, 100) + '...'
                  : thread.anchorData.selectedText}"
              </span>
            </div>
          )}
        </div>

        {/* Replies */}
        <div className="thread-replies-container">
          {thread.replies && thread.replies.length > 0 ? (
            thread.replies.map((reply) => (
              <ThreadReply
                key={reply._id}
                reply={reply}
                onReply={() => setReplyingTo(reply._id)}
                isReplyingTo={replyingTo === reply._id}
                onCancelReply={() => setReplyingTo(null)}
                threadId={threadId}
              />
            ))
          ) : (
            <div className="thread-no-replies">
              <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond!</p>
            </div>
          )}
        </div>

        {/* Reply input at bottom */}
        {!isResolved && !replyingTo && (
          <div className="thread-reply-input-container">
            <ThreadReplyInput threadId={threadId} />
          </div>
        )}

        {isResolved && (
          <div className="thread-resolved-notice">
            <Check className="h-4 w-4" />
            <span>This thread has been resolved</span>
          </div>
        )}
      </div>
    </div>
  )
}
