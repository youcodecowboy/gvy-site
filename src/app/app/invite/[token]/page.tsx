'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { useState } from 'react'
import { Button, Skeleton } from '@/components/ui'
import { Folder, AlertCircle, CheckCircle, Clock, User, Mail } from 'lucide-react'
import Link from 'next/link'

export default function AcceptInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const invitation = useQuery(api.invitations.getByToken, { token })
  const acceptInvitation = useMutation(api.invitations.accept)
  const declineInvitation = useMutation(api.invitations.decline)

  const handleAccept = async () => {
    setIsAccepting(true)
    setError(null)

    try {
      const result = await acceptInvitation({ token })
      setSuccess(true)
      // Redirect to the folder after a short delay
      setTimeout(() => {
        router.push(`/app/folder/${result.folderId}`)
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleDecline = async () => {
    setIsDeclining(true)
    setError(null)

    try {
      await declineInvitation({ token })
      router.push('/app')
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation')
    } finally {
      setIsDeclining(false)
    }
  }

  // Loading state
  if (invitation === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8">
            <Skeleton className="h-12 w-12 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto mb-6" />
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Invitation Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This invitation link is invalid or has been revoked.
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
  if (invitation.status === 'expired' || invitation.expiresAt < Date.now()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Invitation Expired</h1>
            <p className="text-muted-foreground mb-6">
              This invitation has expired. Please ask {invitation.invitedByName} to send you a new one.
            </p>
            <Link href="/app">
              <Button variant="secondary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Already accepted state
  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Already Accepted</h1>
            <p className="text-muted-foreground mb-6">
              You already have access to "{invitation.folderTitle}".
            </p>
            <Link href={`/app/folder/${invitation.folderId}`}>
              <Button>Go to Folder</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Declined state
  if (invitation.status === 'declined') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Invitation Declined</h1>
            <p className="text-muted-foreground mb-6">
              This invitation has been declined.
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
            <h1 className="text-xl font-semibold mb-2">Invitation Accepted!</h1>
            <p className="text-muted-foreground mb-2">
              You now have {invitation.role} access to "{invitation.folderTitle}".
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to folder...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Role descriptions
  const roleDescriptions = {
    viewer: 'View documents in this folder',
    editor: 'View and edit documents in this folder',
    admin: 'Full access including inviting others',
  }

  // Main invitation card
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Folder className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">You've been invited!</h1>
            <p className="text-muted-foreground">
              to access a folder in Groovy Docs
            </p>
          </div>

          {/* Invitation details */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Folder</p>
                <p className="font-medium">{invitation.folderTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Invited by</p>
                <p className="font-medium">{invitation.invitedByName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Your access level</p>
                <p className="font-medium capitalize">{invitation.role}</p>
                <p className="text-xs text-muted-foreground">
                  {roleDescriptions[invitation.role as keyof typeof roleDescriptions]}
                </p>
              </div>
            </div>
          </div>

          {/* Personal message */}
          {invitation.message && (
            <div className="bg-muted/30 border rounded-lg p-4 mb-6">
              <p className="text-sm italic">"{invitation.message}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                — {invitation.invitedByName}
              </p>
            </div>
          )}

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
              onClick={handleAccept}
              disabled={isAccepting || isDeclining}
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleDecline}
              disabled={isAccepting || isDeclining}
            >
              {isDeclining ? 'Declining...' : 'Decline'}
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            By accepting, you'll gain access to this folder and its contents within the organization.
          </p>
        </div>
      </div>
    </div>
  )
}
