'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useUser } from '@clerk/nextjs'
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Link2,
  MoreHorizontal,
  Trash2,
  MessageCircle,
  Send,
  Reply,
  Pencil,
  X,
  CheckCircle2,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ThreadReplyInput } from './ThreadReplyInput'

interface ThreadViewFullProps {
  threadId: Id<'threads'>
  docTitle?: string
  onBack: () => void
  onClose: () => void
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
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: timestamp < Date.now() - 365 * 24 * 60 * 60 * 1000 ? 'numeric' : undefined,
  })
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface ReplyWithChildren {
  _id: Id<'threadReplies'>
  threadId: Id<'threads'>
  parentReplyId?: Id<'threadReplies'>
  authorId: string
  authorName: string
  content: string
  createdAt: number
  updatedAt?: number
  isDeleted?: boolean
  depth: number
  children?: ReplyWithChildren[]
}

export function ThreadViewFull({
  threadId,
  docTitle,
  onBack,
  onClose,
  onAnchorClick,
}: ThreadViewFullProps) {
  const { user } = useUser()
  const [showMenu, setShowMenu] = useState(false)
  const [replyingToId, setReplyingToId] = useState<Id<'threadReplies'> | null>(null)
  const [editingReplyId, setEditingReplyId] = useState<Id<'threadReplies'> | null>(null)
  const [editContent, setEditContent] = useState('')

  const thread = useQuery(api.threads.getThread, { threadId })
  const resolveThread = useMutation(api.threads.resolveThread)
  const reopenThread = useMutation(api.threads.reopenThread)
  const deleteThread = useMutation(api.threads.deleteThread)
  const updateReply = useMutation(api.threads.updateReply)
  const deleteReply = useMutation(api.threads.deleteReply)

  if (!thread) {
    return (
      <div className="threads-panel-fullpage">
        <header className="threads-panel-header-full">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-6 w-48 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <main className="threads-panel-content-full">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="h-8 w-3/4 bg-muted rounded" />
            <div className="h-4 w-1/2 bg-muted rounded" />
            <div className="h-32 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        </main>
      </div>
    )
  }

  const isResolved = thread.status === 'resolved'
  const isAuthor = user?.id === thread.authorId

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
        onBack()
      } catch (error) {
        console.error('Failed to delete thread:', error)
      }
    }
  }

  const handleEditReply = (reply: ReplyWithChildren) => {
    setEditingReplyId(reply._id)
    setEditContent(reply.content)
  }

  const handleSaveEdit = async () => {
    if (!editingReplyId || !editContent.trim()) return
    try {
      await updateReply({ replyId: editingReplyId, content: editContent.trim() })
      setEditingReplyId(null)
      setEditContent('')
    } catch (error) {
      console.error('Failed to update reply:', error)
    }
  }

  const handleDeleteReply = async (replyId: Id<'threadReplies'>) => {
    if (confirm('Delete this reply?')) {
      try {
        await deleteReply({ replyId })
      } catch (error) {
        console.error('Failed to delete reply:', error)
      }
    }
  }

  const renderReply = (reply: ReplyWithChildren, isNested = false) => {
    const isReplyAuthor = user?.id === reply.authorId
    const isEditing = editingReplyId === reply._id
    const isReplyingTo = replyingToId === reply._id

    return (
      <div
        key={reply._id}
        className={`thread-reply-full ${isNested ? 'thread-reply-nested' : ''}`}
        style={{ marginLeft: isNested ? `${Math.min(reply.depth, 3) * 2}rem` : 0 }}
      >
        <div className="thread-reply-full-content">
          <div className="thread-reply-full-header">
            <div className="flex items-center gap-3">
              <div className="thread-avatar-small">
                {reply.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="font-medium text-sm">{reply.authorName}</span>
                <span className="text-muted-foreground text-sm mx-2">·</span>
                <span
                  className="text-muted-foreground text-sm"
                  title={formatFullDate(reply.createdAt)}
                >
                  {formatRelativeTime(reply.createdAt)}
                </span>
                {reply.updatedAt && (
                  <span className="text-muted-foreground text-xs ml-2">(edited)</span>
                )}
              </div>
            </div>

            {isReplyAuthor && !reply.isDeleted && !isEditing && (
              <div className="thread-reply-full-actions">
                <button
                  onClick={() => handleEditReply(reply)}
                  className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteReply(reply._id)}
                  className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {reply.isDeleted ? (
            <p className="thread-reply-full-body text-muted-foreground italic">
              [This reply has been deleted]
            </p>
          ) : isEditing ? (
            <div className="mt-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-lg border border-border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    setEditingReplyId(null)
                    setEditContent('')
                  }}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="thread-reply-full-body">{reply.content}</p>
              {!isResolved && (
                <button
                  onClick={() => setReplyingToId(reply._id)}
                  className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Reply className="h-4 w-4" />
                  Reply
                </button>
              )}
            </>
          )}
        </div>

        {/* Inline reply input */}
        {isReplyingTo && (
          <div className="mt-3 ml-6">
            <ThreadReplyInput
              threadId={threadId}
              parentReplyId={reply._id}
              placeholder={`Reply to ${reply.authorName}...`}
              onCancel={() => setReplyingToId(null)}
              onSuccess={() => setReplyingToId(null)}
              autoFocus
            />
          </div>
        )}

        {/* Nested replies */}
        {reply.children && reply.children.length > 0 && (
          <div className="mt-3">
            {reply.children.map((child) => renderReply(child, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="threads-panel-fullpage">
      {/* Header */}
      <header className="threads-panel-header-full">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            title="Back to threads"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate flex items-center gap-2">
              {thread.title}
              {isResolved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Resolved
                </span>
              )}
            </h1>
            {docTitle && (
              <p className="text-sm text-muted-foreground truncate">{docTitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick actions */}
          {isResolved ? (
            <button
              onClick={handleReopen}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              Reopen
            </button>
          ) : (
            <button
              onClick={handleResolve}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
            >
              <Check className="h-4 w-4" />
              Resolve
            </button>
          )}

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
                  {isAuthor && (
                    <button
                      onClick={() => {
                        handleDelete()
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Thread
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="threads-panel-content-full">
        <div className="thread-view-full-container">
          {/* Thread info card */}
          <div className="thread-info-card">
            <div className="flex items-start gap-4">
              <div className="thread-avatar-large">
                {thread.authorName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{thread.authorName}</span>
                  <span className="text-muted-foreground">started this thread</span>
                </div>
                <p
                  className="text-sm text-muted-foreground"
                  title={formatFullDate(thread.createdAt)}
                >
                  {formatFullDate(thread.createdAt)}
                </p>
              </div>
            </div>

            {/* Anchor preview */}
            {thread.anchorData && (
              <button
                className="thread-anchor-card"
                onClick={() => onAnchorClick?.(thread.anchorData!)}
              >
                <Link2 className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Referenced text</p>
                  <p className="text-sm">
                    "{thread.anchorData.selectedText.length > 200
                      ? thread.anchorData.selectedText.slice(0, 200) + '...'
                      : thread.anchorData.selectedText}"
                  </p>
                </div>
                <span className="text-sm text-primary font-medium whitespace-nowrap">
                  View in document
                </span>
              </button>
            )}
          </div>

          {/* Replies section */}
          <div className="thread-replies-section">
            <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              {thread.replies?.length || 0} {(thread.replies?.length || 0) === 1 ? 'Reply' : 'Replies'}
            </h2>

            {thread.replies && thread.replies.length > 0 ? (
              <div className="space-y-4">
                {thread.replies.map((reply) => renderReply(reply as ReplyWithChildren))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-1">No replies yet</p>
                <p className="text-sm">Be the first to contribute to this discussion</p>
              </div>
            )}
          </div>

          {/* Reply input at bottom */}
          {!isResolved && !replyingToId && (
            <div className="thread-reply-input-full">
              <ThreadReplyInput
                threadId={threadId}
                placeholder="Write a reply..."
              />
            </div>
          )}

          {isResolved && (
            <div className="thread-resolved-banner">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">This thread has been resolved</p>
                <p className="text-sm text-muted-foreground">
                  You can reopen it if the discussion needs to continue
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
