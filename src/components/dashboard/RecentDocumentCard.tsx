'use client'

import Link from 'next/link'
import { FileText, Clock, User } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface RecentDocumentCardProps {
  document: {
    _id: Id<'nodes'>
    title: string
    icon?: string | null
    updatedAt?: number
    updatedBy?: string
    updatedByName?: string
    isOrgDoc?: boolean
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffInMs = now - timestamp
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
  if (diffInHours < 24) return `${diffInHours} hours ago`
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  return new Date(timestamp).toLocaleDateString()
}

export function RecentDocumentCard({ document }: RecentDocumentCardProps) {
  return (
    <Link
      href={`/app/doc/${document._id}`}
      className="block bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          {document.icon ? (
            <span className="text-xl">{document.icon}</span>
          ) : (
            <FileText className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {document.title || 'Untitled'}
          </h3>
          
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {document.updatedAt && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatRelativeTime(document.updatedAt)}</span>
              </div>
            )}
            
            {document.updatedByName && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{document.updatedByName}</span>
              </div>
            )}
          </div>

          {document.isOrgDoc && (
            <span className="inline-flex items-center mt-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
              Shared
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
