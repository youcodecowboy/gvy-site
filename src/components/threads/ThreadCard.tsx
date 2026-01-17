'use client'

import { MessageSquare, Check, Link2 } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface Thread {
  _id: Id<'threads'>
  title: string
  authorId: string
  authorName: string
  anchorData?: {
    from: number
    to: number
    selectedText: string
  }
  status: 'open' | 'resolved'
  createdAt: number
  lastActivityAt: number
  replyCount: number
}

interface ThreadCardProps {
  thread: Thread
  onClick?: () => void
  onAnchorClick?: () => void
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

export function ThreadCard({ thread, onClick, onAnchorClick }: ThreadCardProps) {
  const isResolved = thread.status === 'resolved'

  return (
    <div
      className={`thread-card ${isResolved ? 'is-resolved' : ''}`}
      onClick={onClick}
    >
      <div className="thread-card-header">
        <div className="thread-title-row">
          <h4 className="thread-title">{thread.title}</h4>
          {isResolved && (
            <span className="thread-resolved-badge">
              <Check className="h-3 w-3" />
            </span>
          )}
        </div>
        <div className="thread-meta">
          <span className="thread-author">@{thread.authorName}</span>
          <span className="thread-separator">·</span>
          <span className="thread-time">{formatRelativeTime(thread.lastActivityAt)}</span>
          <span className="thread-separator">·</span>
          <span className="thread-replies">
            <MessageSquare className="h-3 w-3" />
            {thread.replyCount}
          </span>
        </div>
      </div>

      {thread.anchorData && (
        <div
          className="thread-anchor-preview"
          onClick={(e) => {
            e.stopPropagation()
            onAnchorClick?.()
          }}
        >
          <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="thread-anchor-text">
            "{thread.anchorData.selectedText.length > 60
              ? thread.anchorData.selectedText.slice(0, 60) + '...'
              : thread.anchorData.selectedText}"
          </span>
        </div>
      )}
    </div>
  )
}
