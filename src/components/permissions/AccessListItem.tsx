'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id, Doc } from '../../../convex/_generated/dataModel'
import { Button, useToast } from '@/components/ui'
import { User, Trash2, Eye, Edit, Shield, Clock, ChevronDown } from 'lucide-react'

interface AccessListItemProps {
  access: Doc<'folderAccess'>
  folderId: string
  isOrgAdmin?: boolean
}

export function AccessListItem({ access, folderId, isOrgAdmin }: AccessListItemProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const { toast } = useToast()
  const updateRole = useMutation(api.folderAccess.updateRole)
  const revokeAccess = useMutation(api.folderAccess.revoke)

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as 'viewer' | 'editor' | 'admin'
    if (newRole === access.role) return

    setIsUpdating(true)
    try {
      await updateRole({
        folderId: folderId as Id<'nodes'>,
        userId: access.userId,
        role: newRole,
        isOrgAdmin,
      })
      toast({ title: 'Role updated', variant: 'success' })
    } catch (error: any) {
      toast({ title: 'Failed to update role', description: error.message, variant: 'error' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm(`Remove ${access.userName || access.userEmail || 'this user'}'s access to this folder?`)) {
      return
    }

    setIsRevoking(true)
    try {
      await revokeAccess({
        folderId: folderId as Id<'nodes'>,
        userId: access.userId,
        isOrgAdmin,
      })
      toast({ title: 'Access revoked', variant: 'success' })
    } catch (error: any) {
      toast({ title: 'Failed to revoke access', description: error.message, variant: 'error' })
    } finally {
      setIsRevoking(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  // Role icon and colors
  const roleConfig = {
    viewer: {
      icon: Eye,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    editor: {
      icon: Edit,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    admin: {
      icon: Shield,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
    },
  }

  const config = roleConfig[access.role]
  const RoleIcon = config.icon

  // Check if access is expired
  const isExpired = Boolean(access.expiresAt && access.expiresAt < Date.now())

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        isExpired ? 'bg-muted/50 opacity-75' : 'bg-card'
      }`}
    >
      {/* User info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        {access.userAvatar ? (
          <img
            src={access.userAvatar}
            alt={access.userName || 'User'}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        )}

        {/* Name and email */}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {access.userName || 'Unknown User'}
          </p>
          {access.userEmail && (
            <p className="text-xs text-muted-foreground truncate">
              {access.userEmail}
            </p>
          )}
        </div>
      </div>

      {/* Role and actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Expiration badge */}
        {access.expiresAt && (
          <div
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              isExpired
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            }`}
            title={isExpired ? 'Expired' : `Expires ${formatDate(access.expiresAt)}`}
          >
            <Clock className="h-3 w-3" />
            {isExpired ? 'Expired' : formatDate(access.expiresAt)}
          </div>
        )}

        {/* Role selector */}
        <div className="relative">
          <div className={`absolute left-2 top-1/2 -translate-y-1/2 p-0.5 rounded ${config.bg}`}>
            <RoleIcon className={`h-3 w-3 ${config.color}`} />
          </div>
          <select
            value={access.role}
            onChange={handleRoleChange}
            disabled={isUpdating || isExpired}
            className="h-8 pl-8 pr-8 text-sm bg-background border border-input rounded-md appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>

        {/* Revoke button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRevoke}
          disabled={isRevoking}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Remove access"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
