'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { Reply, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ThreadReplyInput } from './ThreadReplyInput'

interface NestedReply {
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
  children: NestedReply[]
}

interface ThreadReplyProps {
  reply: NestedReply
  threadId: Id<'threads'>
  onReply?: () => void
  isReplyingTo?: boolean
  onCancelReply?: () => void
  maxDepth?: number
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

export function ThreadReply({
  reply,
  threadId,
  onReply,
  isReplyingTo = false,
  onCancelReply,
  maxDepth = 3,
}: ThreadReplyProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(reply.content)
  const [showReplyInput, setShowReplyInput] = useState(false)

  const deleteReply = useMutation(api.threads.deleteReply)
  const updateReply = useMutation(api.threads.updateReply)

  const isDeleted = reply.isDeleted
  const canNest = reply.depth < maxDepth

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this reply?')) {
      try {
        await deleteReply({ replyId: reply._id })
      } catch (error) {
        console.error('Failed to delete reply:', error)
      }
    }
    setShowMenu(false)
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(reply.content)
    setShowMenu(false)
  }

  const handleSaveEdit = async () => {
    if (editContent.trim() && editContent !== reply.content) {
      try {
        await updateReply({ replyId: reply._id, content: editContent.trim() })
      } catch (error) {
        console.error('Failed to update reply:', error)
      }
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditContent(reply.content)
  }

  const handleReplyClick = () => {
    if (canNest) {
      setShowReplyInput(true)
    }
  }

  return (
    <div
      className="thread-reply"
      style={{ marginLeft: `${reply.depth * 16}px` }}
    >
      <div className={`thread-reply-content ${isDeleted ? 'is-deleted' : ''}`}>
        {/* Reply header */}
        <div className="thread-reply-header">
          <div className="thread-reply-author">
            <div className="thread-reply-avatar">
              {reply.authorName.charAt(0).toUpperCase()}
            </div>
            <span className="thread-reply-author-name">@{reply.authorName}</span>
            <span className="thread-reply-time">
              {formatRelativeTime(reply.createdAt)}
            </span>
            {reply.updatedAt && (
              <span className="thread-reply-edited">(edited)</span>
            )}
          </div>

          {!isDeleted && (
            <div className="thread-reply-actions">
              {canNest && (
                <button
                  onClick={handleReplyClick}
                  className="thread-reply-action-btn"
                  title="Reply"
                >
                  <Reply className="h-3 w-3" />
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="thread-reply-action-btn"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md z-50 py-1 min-w-[100px]">
                      <button
                        onClick={handleEdit}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent flex items-center gap-2 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reply body */}
        {isEditing ? (
          <div className="thread-reply-edit">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="thread-reply-edit-input"
              rows={3}
              autoFocus
            />
            <div className="thread-reply-edit-actions">
              <button
                onClick={handleCancelEdit}
                className="thread-reply-edit-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="thread-reply-edit-save"
                disabled={!editContent.trim()}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p className="thread-reply-body">{reply.content}</p>
        )}
      </div>

      {/* Inline reply input */}
      {showReplyInput && (
        <div className="thread-reply-inline-input">
          <ThreadReplyInput
            threadId={threadId}
            parentReplyId={reply._id}
            onSuccess={() => setShowReplyInput(false)}
            onCancel={() => setShowReplyInput(false)}
            placeholder={`Reply to @${reply.authorName}...`}
            autoFocus
          />
        </div>
      )}

      {/* Nested children */}
      {reply.children && reply.children.length > 0 && (
        <div className="thread-reply-children">
          {reply.children.map((child) => (
            <ThreadReply
              key={child._id}
              reply={child}
              threadId={threadId}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  )
}
