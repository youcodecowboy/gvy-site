'use client'

import Link from 'next/link'
import { FileText, Bell, ArrowRight } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface Mention {
  _id: Id<'mentions'>
  docId: Id<'nodes'>
  docTitle: string
  mentionedByUserName: string
  createdAt: number
  isRead?: boolean
}

interface MentionsPreviewProps {
  mentions: Mention[]
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

export function MentionsPreview({ mentions, title = 'Recent Mentions' }: MentionsPreviewProps & { title?: string }) {
  if (mentions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <div className="text-center py-4">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No mentions yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            When teammates mention you, it will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {mentions.filter(m => !m.isRead).length} unread
        </span>
      </div>

      <div className="divide-y divide-border">
        {mentions.slice(0, 5).map((mention) => (
          <Link
            key={mention._id}
            href={`/app/doc/${mention.docId}`}
            className={`
              flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors
              ${!mention.isRead ? 'bg-accent/20' : ''}
            `}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{mention.docTitle}</p>
                {!mention.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{mention.mentionedByUserName}</span>
                {' mentioned you · '}
                {formatRelativeTime(mention.createdAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {mentions.length > 5 && (
        <div className="p-3 border-t border-border">
          <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all mentions
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
