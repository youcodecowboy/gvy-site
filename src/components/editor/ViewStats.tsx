'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ViewHistoryModal } from './ViewHistoryModal'

interface ViewStatsProps {
  docId: string
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffInMs = now - timestamp
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  return new Date(timestamp).toLocaleDateString()
}

export function ViewStats({ docId }: ViewStatsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const viewStats = useQuery(api.views.getViewStats, {
    docId: docId as Id<'nodes'>,
  })

  // Don't render if no data yet
  if (!viewStats) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
        title="View history"
      >
        <Eye className="h-3 w-3" />
        <span>
          {viewStats.totalViews} view{viewStats.totalViews !== 1 ? 's' : ''}
        </span>
        {viewStats.lastViewedAt && viewStats.lastViewedByUserName && (
          <span className="hidden sm:inline">
            · {formatRelativeTime(viewStats.lastViewedAt)} by{' '}
            {viewStats.lastViewedByUserName}
          </span>
        )}
      </button>

      <ViewHistoryModal
        docId={docId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
