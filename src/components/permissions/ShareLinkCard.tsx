'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id, Doc } from '../../../convex/_generated/dataModel'
import { Button, useToast } from '@/components/ui'
import {
  Link as LinkIcon,
  Copy,
  Check,
  Eye,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Users,
} from 'lucide-react'

interface ShareLinkCardProps {
  link: Doc<'shareLinks'> & {
    isExpired: boolean
    isMaxedOut: boolean
  }
  isOrgAdmin?: boolean
}

export function ShareLinkCard({ link, isOrgAdmin }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  const { toast } = useToast()
  const disableLink = useMutation(api.shareLinks.disable)
  const enableLink = useMutation(api.shareLinks.enable)
  const removeLink = useMutation(api.shareLinks.remove)

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/app/join/${link.token}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({ title: 'Link copied', variant: 'success' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Failed to copy', variant: 'error' })
    }
  }

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      if (link.isActive) {
        await disableLink({ linkId: link._id, isOrgAdmin })
        toast({ title: 'Link disabled', variant: 'success' })
      } else {
        await enableLink({ linkId: link._id, isOrgAdmin })
        toast({ title: 'Link enabled', variant: 'success' })
      }
    } catch (error: any) {
      toast({ title: 'Failed to update link', description: error.message, variant: 'error' })
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this share link? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      await removeLink({ linkId: link._id, isOrgAdmin })
      toast({ title: 'Link deleted', variant: 'success' })
    } catch (error: any) {
      toast({ title: 'Failed to delete link', description: error.message, variant: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const RoleIcon = link.role === 'viewer' ? Eye : Edit
  const isUsable = link.isActive && !link.isExpired && !link.isMaxedOut

  return (
    <div
      className={`p-4 rounded-lg border ${
        isUsable ? 'bg-card' : 'bg-muted/50 opacity-75'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded ${
              link.role === 'viewer'
                ? 'bg-blue-100 dark:bg-blue-900/30'
                : 'bg-purple-100 dark:bg-purple-900/30'
            }`}
          >
            <RoleIcon
              className={`h-4 w-4 ${
                link.role === 'viewer'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-purple-600 dark:text-purple-400'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-medium capitalize">{link.role} Access</p>
            <p className="text-xs text-muted-foreground">
              Created {formatDate(link.createdAt)}
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {!link.isActive && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Disabled
            </span>
          )}
          {link.isExpired && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              Expired
            </span>
          )}
          {link.isMaxedOut && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              Max Uses
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          <span>
            {link.useCount} use{link.useCount !== 1 ? 's' : ''}
            {link.maxUses && ` / ${link.maxUses} max`}
          </span>
        </div>
        {link.expiresAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {link.isExpired ? 'Expired' : `Expires ${formatDate(link.expiresAt)}`}
            </span>
          </div>
        )}
      </div>

      {/* Link URL */}
      <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono mb-3">
        <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate flex-1">{shareUrl}</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 shrink-0"
          onClick={handleCopy}
          disabled={!isUsable}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={handleCopy}
          disabled={!isUsable}
        >
          <Copy className="h-4 w-4 mr-1" />
          Copy Link
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleToggle}
          disabled={isToggling || link.isExpired}
          title={link.isActive ? 'Disable link' : 'Enable link'}
        >
          {link.isActive ? (
            <ToggleRight className="h-4 w-4 text-green-500" />
          ) : (
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Delete link"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
