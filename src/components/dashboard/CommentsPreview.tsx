'use client'

import Link from 'next/link'
import { MessageSquare, FileText, ArrowRight } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface Comment {
  _id: string
  docId: Id<'nodes'>
  docTitle: string
  authorName: string
  content: string
  createdAt: number
  isResolved?: boolean
}

interface CommentsPreviewProps {
  comments: Comment[]
  title?: string
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

export function CommentsPreview({ comments, title = 'Recent Comments' }: CommentsPreviewProps) {
  if (comments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <div className="text-center py-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No comments yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Comments from your documents will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="divide-y divide-border">
        {comments.slice(0, 6).map((comment) => (
          <Link
            key={comment._id}
            href={`/app/doc/${comment.docId}`}
            className="flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {comment.authorName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{comment.authorName}</p>
                {comment.isResolved && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    Resolved
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {comment.content}
              </p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span className="truncate">{comment.docTitle}</span>
                <span>·</span>
                <span>{formatRelativeTime(comment.createdAt)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {comments.length > 6 && (
        <div className="p-3 border-t border-border">
          <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all comments
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
