'use client'

import { useCallback } from 'react'
import { MessageSquare, X, Check, Trash2 } from 'lucide-react'

interface Comment {
  id: string
  content: string
  author: {
    name: string
    avatar?: string
  }
  createdAt: Date
  resolved: boolean
}

interface CommentsPanelProps {
  comments: Comment[]
  onResolve?: (id: string) => void
  onDelete?: (id: string) => void
  onClose?: () => void
  isOpen: boolean
}

export function CommentsPanel({
  comments,
  onResolve,
  onDelete,
  onClose,
  isOpen,
}: CommentsPanelProps) {
  if (!isOpen) return null

  const unresolvedComments = comments.filter(c => !c.resolved)
  const resolvedComments = comments.filter(c => c.resolved)

  return (
    <div className="comments-panel">
      <div className="comments-panel-header">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-medium">Comments</span>
          <span className="text-xs text-muted-foreground">
            ({unresolvedComments.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="comments-panel-content">
        {comments.length === 0 ? (
          <div className="comments-empty">
            <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select text and click the comment button to add one
            </p>
          </div>
        ) : (
          <>
            {unresolvedComments.length > 0 && (
              <div className="comments-section">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                  Open ({unresolvedComments.length})
                </h4>
                {unresolvedComments.map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onResolve={onResolve}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}

            {resolvedComments.length > 0 && (
              <div className="comments-section mt-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                  Resolved ({resolvedComments.length})
                </h4>
                {resolvedComments.map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onResolve={onResolve}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CommentCard({
  comment,
  onResolve,
  onDelete,
}: {
  comment: Comment
  onResolve?: (id: string) => void
  onDelete?: (id: string) => void
}) {
  return (
    <div className={`comment-card ${comment.resolved ? 'is-resolved' : ''}`}>
      <div className="comment-card-header">
        <div className="comment-author">
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className="comment-avatar"
            />
          ) : (
            <div className="comment-avatar-placeholder">
              {comment.author.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="comment-author-name">{comment.author.name}</span>
        </div>
        <div className="comment-actions">
          {!comment.resolved && onResolve && (
            <button
              onClick={() => onResolve(comment.id)}
              className="comment-action-btn"
              title="Resolve"
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="comment-action-btn text-destructive"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <p className="comment-content">{comment.content}</p>
      <span className="comment-time">
        {formatRelativeTime(comment.createdAt)}
      </span>
    </div>
  )
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString()
}
