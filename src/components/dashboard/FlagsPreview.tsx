'use client'

import Link from 'next/link'
import { Flag, FileText, ArrowRight } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface FlagItem {
  _id: Id<'flags'>
  nodeId: Id<'nodes'>
  nodeTitle: string
  nodeType: 'doc' | 'folder'
  type: 'inline' | 'document' | 'folder'
  selectionData?: {
    from: number
    to: number
    selectedText: string
  }
  senderName: string
  message: string
  createdAt: number
  isRead?: boolean
}

interface FlagsPreviewProps {
  flags: FlagItem[]
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

export function FlagsPreview({ flags, unreadCount = 0 }: FlagsPreviewProps) {
  const markFlagRead = useMutation(api.flags.markFlagRead)

  const handleFlagClick = async (flagId: Id<'flags'>, isRead?: boolean) => {
    if (!isRead) {
      try {
        await markFlagRead({ flagId })
      } catch (error) {
        console.error('Failed to mark flag as read:', error)
      }
    }
  }

  // Build URL with query params for inline flags
  const buildFlagUrl = (flag: FlagItem) => {
    const baseUrl = flag.nodeType === 'folder'
      ? `/app/folder/${flag.nodeId}`
      : `/app/doc/${flag.nodeId}`
    if (flag.type === 'inline' && flag.selectionData) {
      return `${baseUrl}?flag=${flag._id}&from=${flag.selectionData.from}&to=${flag.selectionData.to}`
    }
    return baseUrl
  }

  if (flags.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Flag className="h-4 w-4 text-orange-500" />
          <h3 className="font-medium text-sm">Flags for You</h3>
        </div>
        <div className="text-center py-4">
          <Flag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No flags yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            When teammates flag content for you, it will appear here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-orange-500" />
          <h3 className="font-medium text-sm">Flags for You</h3>
        </div>
        {unreadCount > 0 && (
          <span className="text-xs text-orange-500 font-medium">
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="divide-y divide-border">
        {flags.slice(0, 5).map((flag) => (
          <Link
            key={flag._id}
            href={buildFlagUrl(flag)}
            onClick={() => handleFlagClick(flag._id, flag.isRead)}
            className={`
              flex items-start gap-3 p-3 hover:bg-accent/50 transition-colors
              ${!flag.isRead ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}
            `}
          >
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{flag.nodeTitle}</p>
                {!flag.isRead && (
                  <div className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{flag.senderName}</span>
                {' flagged · '}
                {formatRelativeTime(flag.createdAt)}
              </p>
              {/* Message preview */}
              <p className="text-xs text-foreground/70 mt-1 line-clamp-1">
                {flag.message}
              </p>
              {/* Selected text preview for inline flags */}
              {flag.type === 'inline' && flag.selectionData?.selectedText && (
                <p className="text-xs text-muted-foreground mt-1 italic line-clamp-1 border-l-2 border-orange-500 pl-2">
                  "{flag.selectionData.selectedText.length > 50
                    ? flag.selectionData.selectedText.slice(0, 50) + '...'
                    : flag.selectionData.selectedText}"
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>

      {flags.length > 5 && (
        <div className="p-3 border-t border-border">
          <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all flags
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
