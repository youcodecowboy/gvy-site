'use client'

import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { GitBranch, Plus, X, ChevronDown, History } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface VersionBadgeProps {
  docId: string
  versionString?: string
}

export function VersionBadge({ docId, versionString }: VersionBadgeProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showBumpModal, setShowBumpModal] = useState(false)
  const [changeSummary, setChangeSummary] = useState('')
  const [isBumping, setIsBumping] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  const bumpMajorVersion = useMutation(api.versions.bumpMajorVersion)
  const versionHistory = useQuery(api.versions.getVersionHistory, {
    docId: docId as Id<'nodes'>,
    limit: 15,
  })

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowHistory(false)
        setShowBumpModal(false)
      }
    }

    if (showHistory || showBumpModal) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHistory, showBumpModal])

  const handleBumpVersion = async () => {
    if (isBumping) return

    setIsBumping(true)
    try {
      await bumpMajorVersion({
        docId: docId as Id<'nodes'>,
        changeSummary: changeSummary.trim() || undefined,
      })
      setShowBumpModal(false)
      setChangeSummary('')
    } catch (error) {
      console.error('Failed to bump version:', error)
    } finally {
      setIsBumping(false)
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Version Badge Button */}
      <button
        onClick={() => {
          setShowHistory(!showHistory)
          setShowBumpModal(false)
        }}
        className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 transition-colors"
        title="View version history"
      >
        <GitBranch className="h-3 w-3" />
        <span className="font-mono">{versionString || 'v1.0'}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
      </button>

      {/* Version History Popover */}
      {showHistory && !showBumpModal && (
        <div className="absolute top-full mt-1 right-0 z-50 w-80 bg-background border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-3 border-b bg-background flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Version History</span>
            </div>
            <button
              onClick={() => {
                setShowBumpModal(true)
                setShowHistory(false)
              }}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3 w-3" />
              New Version
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto bg-background">
            {!versionHistory || versionHistory.length === 0 ? (
              <div className="p-4 text-center bg-background">
                <p className="text-xs text-muted-foreground">
                  No version history yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Versions are created automatically as you edit.
                </p>
              </div>
            ) : (
              <div className="divide-y bg-background">
                {versionHistory.map((version) => (
                  <div
                    key={version._id}
                    className={`p-3 hover:bg-muted/50 transition-colors bg-background ${
                      version.isMajorVersion ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {version.versionString}
                        </span>
                        {version.isMajorVersion && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                            Major
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      by {version.createdByName}
                    </div>
                    {version.changeSummary && (
                      <p className="text-xs mt-1.5 text-foreground/80 italic">
                        "{version.changeSummary}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-2 border-t bg-muted/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Minor versions auto-created every 30s of editing
            </p>
          </div>
        </div>
      )}

      {/* Create Major Version Modal */}
      {showBumpModal && (
        <div className="absolute top-full mt-1 right-0 z-50 w-80 bg-background border rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95">
          <div className="p-3 border-b bg-background flex items-center justify-between">
            <span className="font-medium text-sm">Create New Version</span>
            <button
              onClick={() => {
                setShowBumpModal(false)
                setChangeSummary('')
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3 space-y-3 bg-background">
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Create a major version milestone. The current version is{' '}
                <span className="font-mono font-medium">{versionString || 'v1.0'}</span>.
              </p>
              <p className="text-xs text-muted-foreground">
                This will become{' '}
                <span className="font-mono font-medium text-primary">
                  v{((parseInt(versionString?.split('.')[0]?.replace('v', '') || '1') || 1) + 1)}.0
                </span>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">
                Change Summary (optional)
              </label>
              <textarea
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Describe what changed in this version..."
                className="w-full px-2 py-1.5 text-xs border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-background"
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowBumpModal(false)
                  setChangeSummary('')
                }}
                className="flex-1 px-3 py-1.5 text-xs border rounded hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBumpVersion}
                disabled={isBumping}
                className="flex-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isBumping ? 'Creating...' : 'Create Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
