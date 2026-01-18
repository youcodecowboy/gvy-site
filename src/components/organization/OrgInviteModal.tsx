'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useOrganization } from '@clerk/nextjs'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Modal, Button, Input, Skeleton, useToast } from '@/components/ui'
import {
  Link as LinkIcon,
  Copy,
  Check,
  Users,
  Clock,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Plus,
} from 'lucide-react'

interface OrgInviteModalProps {
  isOpen: boolean
  onClose: () => void
}

export function OrgInviteModal({ isOpen, onClose }: OrgInviteModalProps) {
  const { organization, membership } = useOrganization()
  const { toast } = useToast()
  const isOrgAdmin = membership?.role === 'org:admin' || membership?.role === 'admin'

  const [isCreating, setIsCreating] = useState(false)
  const [newLinkUrl, setNewLinkUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Queries
  const inviteLinks = useQuery(
    api.orgInvites.listByOrg,
    organization?.id ? { orgId: organization.id } : 'skip'
  )

  // Mutations
  const createLink = useMutation(api.orgInvites.create)
  const disableLink = useMutation(api.orgInvites.disable)
  const enableLink = useMutation(api.orgInvites.enable)
  const removeLink = useMutation(api.orgInvites.remove)

  const handleCreateLink = async () => {
    if (!organization) return

    setIsCreating(true)
    try {
      const result = await createLink({
        orgId: organization.id,
        orgName: organization.name,
      })

      const url = `${window.location.origin}/app/org-invite/${result.token}`
      setNewLinkUrl(url)

      // Copy to clipboard immediately
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      toast({ title: 'Invite link created and copied!', variant: 'success' })
    } catch (error: any) {
      toast({ title: 'Failed to create link', description: error.message, variant: 'error' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyUrl = async (token: string) => {
    const url = `${window.location.origin}/app/org-invite/${token}`
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: 'Link copied!', variant: 'success' })
    } catch {
      toast({ title: 'Failed to copy link', variant: 'error' })
    }
  }

  const handleToggleLink = async (linkId: Id<'orgInviteLinks'>, isActive: boolean) => {
    try {
      if (isActive) {
        await disableLink({ linkId })
        toast({ title: 'Link disabled', variant: 'success' })
      } else {
        await enableLink({ linkId })
        toast({ title: 'Link enabled', variant: 'success' })
      }
    } catch (error: any) {
      toast({ title: 'Failed to update link', description: error.message, variant: 'error' })
    }
  }

  const handleDeleteLink = async (linkId: Id<'orgInviteLinks'>) => {
    if (!confirm('Are you sure you want to delete this invite link?')) return

    try {
      await removeLink({ linkId })
      toast({ title: 'Link deleted', variant: 'success' })
    } catch (error: any) {
      toast({ title: 'Failed to delete link', description: error.message, variant: 'error' })
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (!organization) {
    return null
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invite to ${organization.name}`}
      size="lg"
    >
      <div className="p-4">
        {/* Info text */}
        <p className="text-sm text-muted-foreground mb-4">
          Create an invite link that anyone can use to join your organization.
          Share it via email, Slack, or any other way.
        </p>

        {/* Create new link section */}
        <div className="mb-6">
          {newLinkUrl ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-medium">Invite Link Created!</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={newLinkUrl}
                  readOnly
                  className="text-sm font-mono"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(newLinkUrl)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                    toast({ title: 'Copied!', variant: 'success' })
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setNewLinkUrl(null)}
              >
                Create Another Link
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleCreateLink}
              disabled={isCreating || !isOrgAdmin}
              className="w-full"
            >
              {isCreating ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invite Link
                </>
              )}
            </Button>
          )}

          {!isOrgAdmin && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Only organization admins can create invite links.
            </p>
          )}
        </div>

        {/* Existing links */}
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Existing Invite Links
          </h3>

          {inviteLinks === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : inviteLinks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <LinkIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No invite links created yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-auto">
              {inviteLinks.map((link) => {
                const isUsable = link.isActive && !link.isExpired && !link.isMaxedOut
                const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/app/org-invite/${link.token}`

                return (
                  <div
                    key={link._id}
                    className={`p-3 rounded-lg border ${
                      isUsable ? 'bg-card' : 'bg-muted/50 opacity-75'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          Created by {link.createdByName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
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
                    <div className="flex items-center gap-4 mb-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>
                          {link.useCount} use{link.useCount !== 1 ? 's' : ''}
                          {link.maxUses && ` / ${link.maxUses} max`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {link.expiresAt
                            ? link.isExpired
                              ? 'Expired'
                              : `Expires ${formatDate(link.expiresAt)}`
                            : 'No expiration'}
                        </span>
                      </div>
                    </div>

                    {/* Link preview */}
                    <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs font-mono mb-2">
                      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate flex-1">{url}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleCopyUrl(link.token)}
                        disabled={!isUsable}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </Button>
                      {isOrgAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleLink(link._id, link.isActive)}
                            disabled={link.isExpired}
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
                            onClick={() => handleDeleteLink(link._id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete link"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground mt-4">
          Invite links expire after 7 days by default. People who use the link will join as members.
        </p>
      </div>
    </Modal>
  )
}
