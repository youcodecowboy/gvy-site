'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'

interface Mention {
  _id: string
  docId: string
  docTitle: string
  mentionedByUserName: string
  createdAt: number
}

interface FolderMentionsIndicatorProps {
  count: number
  mentions: Mention[]
}

export function FolderMentionsIndicator({ count, mentions }: FolderMentionsIndicatorProps) {
  if (count === 0) return null

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {count} unread {count === 1 ? 'mention' : 'mentions'} in this folder
          </p>
          <p className="text-xs text-muted-foreground">
            You've been mentioned in documents within this folder
          </p>
        </div>
        {mentions.length > 0 && (
          <Link
            href={`/app/doc/${mentions[0].docId}`}
            className="text-sm text-primary hover:underline font-medium shrink-0"
          >
            View →
          </Link>
        )}
      </div>
    </div>
  )
}
