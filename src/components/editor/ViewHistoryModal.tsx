'use client'

import { Eye, User } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Modal } from '../ui/Modal'

interface ViewHistoryModalProps {
  docId: string
  isOpen: boolean
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

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ViewHistoryModal({
  docId,
  isOpen,
  onClose,
}: ViewHistoryModalProps) {
  const viewHistory = useQuery(
    api.views.getViewHistory,
    isOpen ? { docId: docId as Id<'nodes'>, limit: 50 } : 'skip'
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="View History" size="md">
      <div className="p-4">
        {!viewHistory ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-32 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : viewHistory.length === 0 ? (
          <div className="text-center py-8">
            <Eye className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No views yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Views will appear here when people open this document
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {viewHistory.map((view) => (
              <div
                key={view._id}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent/50"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {view.viewedByUserName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(view.viewedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
