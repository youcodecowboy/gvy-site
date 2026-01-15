'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import { FileText, Bell, CheckCheck, X } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface NotificationDropdownProps {
  onClose: () => void
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

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const mentions = useQuery(api.mentions.getMentions, { limit: 20 })
  const markMentionRead = useMutation(api.mentions.markMentionRead)
  const markAllMentionsRead = useMutation(api.mentions.markAllMentionsRead)
  const deleteMention = useMutation(api.mentions.deleteMention)

  const handleMarkRead = useCallback(async (mentionId: Id<'mentions'>) => {
    try {
      await markMentionRead({ mentionId })
    } catch (error) {
      console.error('Failed to mark mention as read:', error)
    }
  }, [markMentionRead])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllMentionsRead()
    } catch (error) {
      console.error('Failed to mark all mentions as read:', error)
    }
  }, [markAllMentionsRead])

  const handleDelete = useCallback(async (mentionId: Id<'mentions'>, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await deleteMention({ mentionId })
    } catch (error) {
      console.error('Failed to delete mention:', error)
    }
  }, [deleteMention])

  const unreadMentions = mentions?.filter(m => !m.isRead) ?? []
  const hasUnread = unreadMentions.length > 0

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Notifications</span>
          {hasUnread && (
            <span className="text-xs text-muted-foreground">
              ({unreadMentions.length} unread)
            </span>
          )}
        </div>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>

      {/* Mentions List */}
      <div className="flex-1 overflow-y-auto">
        {mentions === undefined ? (
          // Loading state
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-muted rounded" />
                  <div className="h-2 w-1/2 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : mentions.length === 0 ? (
          // Empty state
          <div className="p-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;ll see mentions here when teammates tag you
            </p>
          </div>
        ) : (
          // Mentions list
          <div className="divide-y divide-border">
            {mentions.map((mention) => (
              <Link
                key={mention._id}
                href={`/app/doc/${mention.docId}`}
                onClick={() => {
                  if (!mention.isRead) {
                    handleMarkRead(mention._id)
                  }
                  onClose()
                }}
                className={`
                  block p-3 hover:bg-accent/50 transition-colors group
                  ${!mention.isRead ? 'bg-accent/20' : ''}
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {mention.docTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">{mention.mentionedByUserName}</span>
                          {' mentioned you'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!mention.isRead && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <button
                          onClick={(e) => handleDelete(mention._id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded transition-all"
                          title="Dismiss"
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(mention.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {mentions && mentions.length > 0 && (
        <div className="p-2 border-t border-border">
          <Link
            href="/app"
            onClick={onClose}
            className="block w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 transition-colors"
          >
            View all activity
          </Link>
        </div>
      )}
    </div>
  )
}
