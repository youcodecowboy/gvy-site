'use client'

import Link from 'next/link'
import { FileText, Clock, User } from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'

interface ActivityItem {
  _id: Id<'nodes'>
  title: string
  icon?: string | null
  updatedAt?: number
  updatedBy?: string
  updatedByName?: string
  isOrgDoc?: boolean
}

interface RecentActivityProps {
  activities: ActivityItem[]
  title?: string
  emptyMessage?: string
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffInMs = now - timestamp
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m`
  if (diffInHours < 24) return `${diffInHours}h`
  if (diffInDays < 7) return `${diffInDays}d`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentActivity({ activities, title = 'Recent Activity', emptyMessage = 'No recent activity' }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-1">
        {activities.map((activity) => (
          <Link
            key={activity._id}
            href={`/app/doc/${activity._id}`}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors group"
          >
            {/* Icon */}
            <div className="shrink-0">
              {activity.icon ? (
                <span className="text-base">{activity.icon}</span>
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {activity.title || 'Untitled'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {activity.updatedByName && (
                  <>
                    <span>{activity.updatedByName}</span>
                    <span>·</span>
                  </>
                )}
                {activity.updatedAt && (
                  <span>{formatRelativeTime(activity.updatedAt)}</span>
                )}
                {activity.isOrgDoc && (
                  <>
                    <span>·</span>
                    <span className="text-blue-600 dark:text-blue-400">Shared</span>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
