'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Bell, CheckCheck, X, Users, FolderPlus, Pencil, Trash2, MessageSquare, CheckCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { useOrganization } from '@clerk/nextjs'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface NotificationDropdownProps {
  onClose: () => void
}

type TabType = 'personal' | 'organization'

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

function getActivityIcon(type: string) {
  switch (type) {
    case 'doc_created':
      return FileText
    case 'doc_updated':
      return Pencil
    case 'doc_deleted':
      return Trash2
    case 'folder_created':
      return FolderPlus
    case 'folder_updated':
      return Pencil
    case 'folder_deleted':
      return Trash2
    case 'thread_created':
      return MessageSquare
    case 'thread_resolved':
      return CheckCircle
    default:
      return FileText
  }
}

function getActivityLabel(type: string): string {
  switch (type) {
    case 'doc_created':
      return 'created a document'
    case 'doc_updated':
      return 'updated a document'
    case 'doc_deleted':
      return 'deleted a document'
    case 'folder_created':
      return 'created a folder'
    case 'folder_updated':
      return 'updated a folder'
    case 'folder_deleted':
      return 'deleted a folder'
    case 'thread_created':
      return 'started a discussion'
    case 'thread_resolved':
      return 'resolved a discussion'
    default:
      return 'made a change'
  }
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const [activeTab, setActiveTab] = useState<TabType>('personal')
  const { organization } = useOrganization()

  // Personal notifications (mentions)
  const mentions = useQuery(api.mentions.getMentions, { limit: 20 })
  const markMentionRead = useMutation(api.mentions.markMentionRead)
  const markAllMentionsRead = useMutation(api.mentions.markAllMentionsRead)
  const deleteMention = useMutation(api.mentions.deleteMention)

  // Organization activity
  const orgActivity = useQuery(api.activity.getOrgActivity, {
    orgId: organization?.id,
    limit: 30,
  })

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
      {/* Header with Tabs */}
      <div className="border-b border-border">
        <div className="flex items-center justify-between p-3 pb-0">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Notifications</span>
          </div>
          {activeTab === 'personal' && hasUnread && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex px-3 pt-3">
          <button
            onClick={() => setActiveTab('personal')}
            className={`
              flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors
              ${activeTab === 'personal'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            Personal
            {hasUnread && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 text-xs rounded-full bg-primary text-primary-foreground">
                {unreadMentions.length > 99 ? '99+' : unreadMentions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('organization')}
            className={`
              flex-1 py-2 text-sm font-medium text-center border-b-2 transition-colors
              ${activeTab === 'organization'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
              }
            `}
          >
            Organization
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'personal' ? (
          // Personal Tab - Mentions
          <>
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
                <p className="text-sm text-muted-foreground">No personal notifications</p>
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
          </>
        ) : (
          // Organization Tab - Activity Feed
          <>
            {orgActivity === undefined ? (
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
            ) : orgActivity.length === 0 ? (
              // Empty state
              <div className="p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No organization activity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Activity from your team will appear here
                </p>
              </div>
            ) : (
              // Activity list
              <div className="divide-y divide-border">
                {orgActivity.map((activity) => {
                  const ActivityIcon = getActivityIcon(activity.type)
                  const isClickable = activity.nodeId && !activity.type.includes('deleted')

                  const content = (
                    <div className="flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{activity.userName}</span>
                          {' '}
                          <span className="text-muted-foreground">{getActivityLabel(activity.type)}</span>
                        </p>
                        <p className="text-sm font-medium truncate mt-0.5">
                          {activity.nodeTitle}
                        </p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {activity.details}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  )

                  if (isClickable && activity.nodeType === 'doc') {
                    return (
                      <Link
                        key={activity._id}
                        href={`/app/doc/${activity.nodeId}`}
                        onClick={onClose}
                        className="block"
                      >
                        {content}
                      </Link>
                    )
                  }

                  if (isClickable && activity.nodeType === 'folder') {
                    return (
                      <Link
                        key={activity._id}
                        href={`/app/folder/${activity.nodeId}`}
                        onClick={onClose}
                        className="block"
                      >
                        {content}
                      </Link>
                    )
                  }

                  return <div key={activity._id}>{content}</div>
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {((activeTab === 'personal' && mentions && mentions.length > 0) ||
        (activeTab === 'organization' && orgActivity && orgActivity.length > 0)) && (
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
