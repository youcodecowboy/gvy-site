'use client'

import Link from 'next/link'
import { Users, FileText, Home, Folder } from 'lucide-react'
import { usePresence } from '@/contexts/presence-context'

interface OnlineUsersDropdownProps {
  onClose: () => void
}

function formatLocation(
  path: string,
  nodeTitle?: string,
  nodeType?: 'doc' | 'folder'
): { icon: typeof FileText; label: string } {
  if (path.includes('/doc/')) {
    return {
      icon: FileText,
      label: nodeTitle || 'Document',
    }
  }
  if (path.includes('/folder/')) {
    return {
      icon: Folder,
      label: nodeTitle || 'Folder',
    }
  }
  if (path === '/app' || path === '/app/') {
    return {
      icon: Home,
      label: 'Dashboard',
    }
  }
  return {
    icon: Home,
    label: 'App',
  }
}

function formatLastSeen(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 30) return 'Active now'
  if (seconds < 60) return 'Active just now'
  return `Active ${Math.floor(seconds / 60)}m ago`
}

export function OnlineUsersDropdown({ onClose }: OnlineUsersDropdownProps) {
  const { onlineUsers, isLoading } = usePresence()

  return (
    <div className="absolute right-0 top-full mt-2 w-72 bg-background border border-border rounded-lg shadow-lg z-50 max-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">Online Now</span>
        <span className="text-xs text-muted-foreground">
          ({onlineUsers.length})
        </span>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading state
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2 w-16 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Users list
          <div className="divide-y divide-border">
            {onlineUsers.map((user) => {
              const location = formatLocation(
                user.currentPath,
                user.currentNodeTitle,
                user.currentNodeType
              )
              const LocationIcon = location.icon
              const displayName = user.isCurrentUser ? 'You' : user.userName

              const content = (
                <div className={`flex items-start gap-3 p-3 transition-colors ${user.isCurrentUser ? 'bg-accent/30' : 'hover:bg-accent/50'}`}>
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {user.userAvatar ? (
                      <img
                        src={user.userAvatar}
                        alt={displayName}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
                        style={{ backgroundColor: user.userColor }}
                      >
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Online indicator */}
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {displayName}
                      {user.isCurrentUser && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">(this is you)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <LocationIcon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{location.label}</span>
                    </div>
                    {!user.isCurrentUser && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatLastSeen(user.lastSeenAt)}
                      </p>
                    )}
                  </div>
                </div>
              )

              // Current user is not clickable
              if (user.isCurrentUser) {
                return <div key={user.userId}>{content}</div>
              }

              // Make clickable if viewing a document or folder
              if (user.currentNodeId && user.currentNodeType) {
                const href = user.currentNodeType === 'doc'
                  ? `/app/doc/${user.currentNodeId}`
                  : `/app/folder/${user.currentNodeId}`
                return (
                  <Link
                    key={user.userId}
                    href={href}
                    onClick={onClose}
                    className="block"
                  >
                    {content}
                  </Link>
                )
              }

              return <div key={user.userId}>{content}</div>
            })}
          </div>
        )}
      </div>
    </div>
  )
}
