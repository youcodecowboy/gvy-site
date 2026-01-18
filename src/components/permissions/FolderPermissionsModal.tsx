'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { useOrganization } from '@clerk/nextjs'
import {
  Button,
  Modal,
  Skeleton,
  useToast,
} from '@/components/ui'
import { Users, Link as LinkIcon, Mail, Lock, Unlock } from 'lucide-react'
import { InviteForm } from './InviteForm'
import { ShareLinkCard } from './ShareLinkCard'
import { AccessListItem } from './AccessListItem'

interface FolderPermissionsModalProps {
  folderId: string
  folderTitle: string
  isOpen: boolean
  onClose: () => void
  isRestricted?: boolean
  orgId?: string
}

type TabType = 'people' | 'invitations' | 'links'

export function FolderPermissionsModal({
  folderId,
  folderTitle,
  isOpen,
  onClose,
  isRestricted = false,
  orgId,
}: FolderPermissionsModalProps) {
  const { membership } = useOrganization()
  const isOrgAdmin = membership?.role === 'org:admin' || membership?.role === 'admin'
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabType>('people')

  // Queries
  const accessList = useQuery(
    api.folderAccess.listByFolder,
    isOpen ? { folderId: folderId as Id<'nodes'> } : 'skip'
  )
  const pendingInvitations = useQuery(
    api.invitations.listPendingByFolder,
    isOpen ? { folderId: folderId as Id<'nodes'> } : 'skip'
  )
  const shareLinks = useQuery(
    api.shareLinks.listByFolder,
    isOpen ? { folderId: folderId as Id<'nodes'> } : 'skip'
  )

  // Mutations
  const toggleRestriction = useMutation(api.nodes.toggleRestriction)
  const createShareLink = useMutation(api.shareLinks.create)

  const handleToggleRestriction = async () => {
    const newValue = !isRestricted
    try {
      await toggleRestriction({
        id: folderId as Id<'nodes'>,
        isRestricted: newValue,
        isOrgAdmin,
      })
      toast({
        title: newValue ? 'Restrictions enabled' : 'Restrictions disabled',
        description: newValue
          ? 'Only users with explicit access can view this folder'
          : 'All organization members can now access this folder',
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Failed to update restrictions',
        description: error.message,
        variant: 'error',
      })
    }
  }

  const handleCreateShareLink = async (role: 'viewer' | 'editor') => {
    try {
      await createShareLink({
        folderId: folderId as Id<'nodes'>,
        role,
        isOrgAdmin,
      })
      toast({
        title: 'Share link created',
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Failed to create share link',
        description: error.message,
        variant: 'error',
      })
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'people',
      label: 'People',
      icon: <Users className="h-4 w-4" />,
      count: accessList?.length,
    },
    {
      id: 'invitations',
      label: 'Invitations',
      icon: <Mail className="h-4 w-4" />,
      count: pendingInvitations?.length,
    },
    {
      id: 'links',
      label: 'Share Links',
      icon: <LinkIcon className="h-4 w-4" />,
      count: shareLinks?.length,
    },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${folderTitle}"`}
      size="2xl"
    >
      <div className="p-4">
        {/* Restriction toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            {isRestricted ? (
              <Lock className="h-5 w-5 text-orange-500" />
            ) : (
              <Unlock className="h-5 w-5 text-green-500" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isRestricted ? 'Restricted access' : 'Open to organization'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRestricted
                  ? 'Only users you invite can access this folder'
                  : 'All organization members can access this folder'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleRestriction}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isRestricted ? 'bg-primary' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isRestricted ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 text-xs bg-muted-foreground/20 rounded-full px-2">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="max-h-[50vh] overflow-auto">
          {/* People Tab */}
          {activeTab === 'people' && (
            <div>
              {!isRestricted ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Unlock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    This folder is open to all organization members
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enable restrictions above to manage individual access
                  </p>
                </div>
              ) : accessList === undefined ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : accessList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No users have been granted access yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Send invitations to give people access to this folder
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {accessList.map((access) => (
                    <AccessListItem
                      key={access._id}
                      access={access}
                      folderId={folderId}
                      isOrgAdmin={isOrgAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div>
              <InviteForm
                folderId={folderId}
                orgId={orgId}
                isOrgAdmin={isOrgAdmin}
              />

              {pendingInvitations && pendingInvitations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Pending Invitations</h4>
                  <div className="space-y-2">
                    {pendingInvitations.map((invitation) => (
                      <div
                        key={invitation._id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {invitation.role} access
                            {invitation.isExpired && (
                              <span className="text-orange-500 ml-2">Expired</span>
                            )}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const url = `${window.location.origin}/app/invite/${invitation.token}`
                            navigator.clipboard.writeText(url)
                            toast({ title: 'Link copied', variant: 'success' })
                          }}
                        >
                          Copy Link
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Share Links Tab */}
          {activeTab === 'links' && (
            <div>
              <div className="flex gap-2 mb-4">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCreateShareLink('viewer')}
                >
                  Create Viewer Link
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCreateShareLink('editor')}
                >
                  Create Editor Link
                </Button>
              </div>

              {shareLinks === undefined ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : shareLinks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    No share links created yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Create a link to share with multiple people
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shareLinks.map((link) => (
                    <ShareLinkCard
                      key={link._id}
                      link={link}
                      isOrgAdmin={isOrgAdmin}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
