'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import {
  MessageSquareMore,
  ArrowLeft,
  Plus,
  ChevronDown,
  Link2,
  MessageCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { ThreadCard } from './ThreadCard'
import { ThreadViewFull } from './ThreadViewFull'

interface ThreadsPanelProps {
  docId: Id<'nodes'>
  docTitle?: string
  isOpen: boolean
  onClose: () => void
  onCreateThread?: () => void
  onNavigateToAnchor?: (anchorData: { from: number; to: number }) => void
}

type SortOption = 'recent' | 'oldest' | 'replies'
type FilterOption = 'all' | 'open' | 'resolved'

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

export function ThreadsPanel({
  docId,
  docTitle,
  isOpen,
  onClose,
  onCreateThread,
  onNavigateToAnchor,
}: ThreadsPanelProps) {
  const [selectedThreadId, setSelectedThreadId] = useState<Id<'threads'> | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('recent')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  const threads = useQuery(api.threads.getThreadsByDoc, { docId })

  if (!isOpen) return null

  // Filter threads
  let filteredThreads = threads ?? []
  if (filterBy === 'open') {
    filteredThreads = filteredThreads.filter((t) => t.status === 'open')
  } else if (filterBy === 'resolved') {
    filteredThreads = filteredThreads.filter((t) => t.status === 'resolved')
  }

  const openThreads = threads?.filter((t) => t.status === 'open') ?? []
  const resolvedThreads = threads?.filter((t) => t.status === 'resolved') ?? []

  // Sort threads based on selected option
  const sortThreads = (threadList: typeof threads) => {
    if (!threadList) return []

    switch (sortBy) {
      case 'oldest':
        return [...threadList].sort((a, b) => a.createdAt - b.createdAt)
      case 'replies':
        return [...threadList].sort((a, b) => b.replyCount - a.replyCount)
      case 'recent':
      default:
        return [...threadList].sort((a, b) => b.lastActivityAt - a.lastActivityAt)
    }
  }

  const sortedThreads = sortThreads(filteredThreads)

  // Handle anchor click - close panel and navigate to document
  const handleAnchorClick = (anchorData: { from: number; to: number }) => {
    onNavigateToAnchor?.(anchorData)
  }

  // If a thread is selected, show the full thread view
  if (selectedThreadId) {
    return (
      <ThreadViewFull
        threadId={selectedThreadId}
        docTitle={docTitle}
        onBack={() => setSelectedThreadId(null)}
        onClose={onClose}
        onAnchorClick={handleAnchorClick}
      />
    )
  }

  return (
    <div className="threads-panel-fullpage">
      {/* Header */}
      <header className="threads-panel-header-full">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5 text-primary" />
            Threads
          </h2>
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              {openThreads.length} open
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {resolvedThreads.length} resolved
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">

          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              {filterBy === 'all' ? 'All' : filterBy === 'open' ? 'Open' : 'Resolved'}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showFilterMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowFilterMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[120px]">
                  <button
                    onClick={() => { setFilterBy('all'); setShowFilterMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${filterBy === 'all' ? 'text-primary font-medium' : ''}`}
                  >
                    All threads
                  </button>
                  <button
                    onClick={() => { setFilterBy('open'); setShowFilterMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${filterBy === 'open' ? 'text-primary font-medium' : ''}`}
                  >
                    Open only
                  </button>
                  <button
                    onClick={() => { setFilterBy('resolved'); setShowFilterMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${filterBy === 'resolved' ? 'text-primary font-medium' : ''}`}
                  >
                    Resolved only
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm"
            >
              <Clock className="h-4 w-4" />
              {sortBy === 'recent' ? 'Recent' : sortBy === 'oldest' ? 'Oldest' : 'Most Replies'}
              <ChevronDown className="h-4 w-4" />
            </button>
            {showSortMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSortMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                  <button
                    onClick={() => { setSortBy('recent'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${sortBy === 'recent' ? 'text-primary font-medium' : ''}`}
                  >
                    Most Recent
                  </button>
                  <button
                    onClick={() => { setSortBy('oldest'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${sortBy === 'oldest' ? 'text-primary font-medium' : ''}`}
                  >
                    Oldest First
                  </button>
                  <button
                    onClick={() => { setSortBy('replies'); setShowSortMenu(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${sortBy === 'replies' ? 'text-primary font-medium' : ''}`}
                  >
                    Most Replies
                  </button>
                </div>
              </>
            )}
          </div>

          {/* New Thread Button */}
          {onCreateThread && (
            <button
              onClick={onCreateThread}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Thread
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="threads-panel-content-full">
        {threads === undefined ? (
          <div className="threads-loading-full">
            <div className="animate-pulse space-y-4 max-w-2xl mx-auto">
              <div className="h-24 bg-muted rounded-lg" />
              <div className="h-24 bg-muted rounded-lg" />
              <div className="h-24 bg-muted rounded-lg" />
            </div>
          </div>
        ) : sortedThreads.length === 0 ? (
          <div className="threads-empty-full">
            <div className="text-center max-w-md mx-auto">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <MessageSquareMore className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {filterBy === 'all' ? 'No threads yet' : `No ${filterBy} threads`}
              </h2>
              <p className="text-muted-foreground mb-6">
                {filterBy === 'all'
                  ? 'Start a discussion by selecting text in the document and clicking "Add to Thread"'
                  : filterBy === 'open'
                    ? 'All threads have been resolved'
                    : 'No threads have been resolved yet'
                }
              </p>
              {onCreateThread && filterBy === 'all' && (
                <button
                  onClick={onCreateThread}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Start a Thread
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="threads-list-full">
            {sortedThreads.map((thread) => (
              <div
                key={thread._id}
                className="thread-card-full"
                onClick={() => setSelectedThreadId(thread._id)}
              >
                <div className="thread-card-full-header">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="thread-avatar">
                      {thread.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="thread-card-full-title">{thread.title}</h3>
                        {thread.status === 'resolved' && (
                          <span className="thread-resolved-badge-full">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Resolved
                          </span>
                        )}
                      </div>
                      <div className="thread-card-full-meta">
                        <span>@{thread.authorName}</span>
                        <span className="text-muted-foreground">·</span>
                        <span>{formatRelativeTime(thread.lastActivityAt)}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anchor preview - clickable to navigate to document */}
                {thread.anchorData && (
                  <button
                    className="thread-anchor-preview-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAnchorClick(thread.anchorData!)
                    }}
                  >
                    <Link2 className="h-4 w-4 text-primary shrink-0" />
                    <span className="thread-anchor-text-full">
                      "{thread.anchorData.selectedText.length > 150
                        ? thread.anchorData.selectedText.slice(0, 150) + '...'
                        : thread.anchorData.selectedText}"
                    </span>
                    <span className="text-xs text-primary font-medium whitespace-nowrap">
                      Go to text
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
