'use client'

import Link from 'next/link'
import { MessageSquareMore, MessageSquare, ArrowRight, Check } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface ThreadItem {
  _id: Id<'threads'>
  docId: Id<'nodes'>
  docTitle?: string
  title: string
  authorName: string
  status: 'open' | 'resolved'
  replyCount: number
  lastActivityAt: number
  anchorData?: {
    from: number
    to: number
    selectedText: string
  }
}

interface ThreadsPreviewProps {
  threads: ThreadItem[]
  unreadCount?: number
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

export function ThreadsPreview({ threads, unreadCount = 0 }: ThreadsPreviewProps) {
  if (threads.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquareMore className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Recent Threads</h3>
        </div>
        <div className="text-center py-4">
          <MessageSquareMore className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No threads yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a discussion on any document to see it here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareMore className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Recent Threads</h3>
        </div>
        {unreadCount > 0 && (
          <span className="text-xs text-primary font-medium">
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {threads.slice(0, 5).map((thread) => (
          <Link
            key={thread._id}
            href={`/app/doc/${thread.docId}?openThreads=1&thread=${thread._id}`}
            className="flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {thread.status === 'resolved' ? (
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <MessageSquare className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{thread.title}</p>
                {thread.status === 'resolved' && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded shrink-0">
                    Resolved
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">@{thread.authorName}</span>
                {' in '}
                <span className="font-medium">{thread.docTitle || 'Untitled'}</span>
                {' · '}
                {formatRelativeTime(thread.lastActivityAt)}
              </p>
              {/* Reply count */}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
              </p>
              {/* Anchor preview */}
              {thread.anchorData?.selectedText && (
                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1 border-l-2 border-primary pl-2">
                  "{thread.anchorData.selectedText.length > 50
                    ? thread.anchorData.selectedText.slice(0, 50) + '...'
                    : thread.anchorData.selectedText}"
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {threads.length > 5 && (
        <div className="p-3 border-t border-border">
          <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all threads
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
