'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, Skeleton } from '@/components/ui'
import { Folder, AlertCircle, CheckCircle, Clock, Link as LinkIcon, Eye, Edit } from 'lucide-react'
import Link from 'next/link'

export default function JoinViaShareLinkPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const hasAttemptedAutoJoin = useRef(false)

  const shareLink = useQuery(api.shareLinks.getByToken, { token })
  const applyShareLink = useMutation(api.shareLinks.use)

  const handleJoin = useCallback(async () => {
    setIsJoining(true)
    setError(null)

    try {
      const result = await applyShareLink({ token })
      setSuccess(true)
      // Redirect to the folder after a short delay
      setTimeout(() => {
        router.push(`/app/folder/${result.folderId}`)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to join folder')
    } finally {
      setIsJoining(false)
    }
  }, [applyShareLink, token, router])

  // Auto-join when page loads (share links are typically used for quick access)
  useEffect(() => {
    if (shareLink && shareLink.isUsable && !hasAttemptedAutoJoin.current) {
      hasAttemptedAutoJoin.current = true
      handleJoin()
    }
  }, [shareLink, handleJoin])

  // Loading state
  if (shareLink === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-6" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!shareLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This share link is invalid or has been deleted.
            </p>
            <Link href="/app">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Inactive state
  if (!shareLink.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Disabled</h1>
            <p className="text-muted-foreground mb-6">
              This share link has been disabled by the folder owner.
            </p>
            <Link href="/app">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Expired state
  if (shareLink.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
            <p className="text-muted-foreground mb-6">
              This share link has expired. Please request a new link from the folder owner.
            </p>
            <Link href="/app">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Max uses reached state
  if (shareLink.isMaxedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Limit Reached</h1>
            <p className="text-muted-foreground mb-6">
              This share link has reached its maximum number of uses. Please request a new link from the folder owner.
            </p>
            <Link href="/app">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Access Granted!</h1>
            <p className="text-muted-foreground mb-2">
              You now have {shareLink.role} access to "{shareLink.folderTitle}".
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to folder...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Role icon
  const RoleIcon = shareLink.role === 'viewer' ? Eye : Edit

  // Main share link card
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Folder className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Join Folder</h1>
            <p className="text-muted-foreground">
              You've been invited to access a shared folder
            </p>
          </div>

          {/* Folder details */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Folder</p>
                <p className="font-medium">{shareLink.folderTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RoleIcon className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Access level</p>
                <p className="font-medium capitalize">{shareLink.role}</p>
                <p className="text-xs text-muted-foreground">
                  {shareLink.role === 'viewer'
                    ? 'View documents in this folder'
                    : 'View and edit documents in this folder'}
                </p>
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining ? 'Joining...' : 'Join Folder'}
            </Button>
            <Link href="/app" className="block">
              <Button variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            Shared by {shareLink.createdByName}
          </p>
        </div>
      </div>
    </div>
  )
}
