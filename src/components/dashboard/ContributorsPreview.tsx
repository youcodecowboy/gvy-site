'use client'

import { Users } from 'lucide-react'

interface Contributor {
  userId: string
  userName: string
  docCount: number
  lastActivity: number
  createdDocs: number
  editedDocs: number
}

interface ContributorsPreviewProps {
  contributors: Contributor[]
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diffMs = now - timestamp
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

// Generate consistent color for user based on name
function getUserColor(name: string): string {
  const colors = [
    'bg-blue-500/10 text-blue-600',
    'bg-green-500/10 text-green-600',
    'bg-purple-500/10 text-purple-600',
    'bg-orange-500/10 text-orange-600',
    'bg-pink-500/10 text-pink-600',
    'bg-indigo-500/10 text-indigo-600',
    'bg-teal-500/10 text-teal-600',
    'bg-red-500/10 text-red-600',
  ]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function ContributorsPreview({ contributors }: ContributorsPreviewProps) {
  if (contributors.length === 0) return null

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Contributors</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {contributors.length} {contributors.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      <div className="divide-y divide-border">
        {contributors.map((contributor) => (
          <div
            key={contributor.userId}
            className="flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors"
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 font-medium text-sm ${getUserColor(contributor.userName)}`}>
              {getInitials(contributor.userName)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{contributor.userName}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {contributor.createdDocs > 0 && contributor.editedDocs > 0
                    ? `${contributor.docCount} ${contributor.docCount === 1 ? 'contribution' : 'contributions'}`
                    : contributor.createdDocs > 0
                    ? `${contributor.createdDocs} created`
                    : `${contributor.editedDocs} edited`}
                </span>
                <span>·</span>
                <span>{formatRelativeTime(contributor.lastActivity)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
