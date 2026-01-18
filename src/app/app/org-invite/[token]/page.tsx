'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser, useOrganizationList } from '@clerk/nextjs'
import { Button, Skeleton } from '@/components/ui'
import { Building2, AlertCircle, CheckCircle, Clock, Link as LinkIcon, Users, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function OrgInvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const { user, isLoaded: userLoaded, isSignedIn } = useUser()
  const { setActive, userMemberships, isLoaded: orgListLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  })

  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const hasAttemptedJoin = useRef(false)

  const inviteLink = useQuery(api.orgInvites.getByToken, { token })
  const recordUse = useMutation(api.orgInvites.recordUse)

  // Check if user is already a member of this org
  const isAlreadyMember = userMemberships?.data?.some(
    (membership) => membership.organization.id === inviteLink?.orgId
  )

  const handleJoin = useCallback(async () => {
    if (!inviteLink || !user || !setActive) return

    // If already a member, just redirect
    if (isAlreadyMember) {
      await setActive({ organization: inviteLink.orgId })
      router.push('/app')
      return
    }

    setIsJoining(true)
    setError(null)

    try {
      // Call API to join the organization
      const response = await fetch('/api/org-invite/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join organization')
      }

      // Record the use in Convex
      await recordUse({ token })

      setSuccess(true)

      // Switch to the new org and redirect after a short delay
      setTimeout(async () => {
        if (setActive) {
          await setActive({ organization: inviteLink.orgId })
        }
        router.push('/app')
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Failed to join organization')
    } finally {
      setIsJoining(false)
    }
  }, [inviteLink, user, setActive, isAlreadyMember, token, recordUse, router])

  // Auto-join if signed in and link is valid
  useEffect(() => {
    if (
      inviteLink?.isUsable &&
      isSignedIn &&
      userLoaded &&
      orgListLoaded &&
      !hasAttemptedJoin.current &&
      !success &&
      !error
    ) {
      hasAttemptedJoin.current = true
      handleJoin()
    }
  }, [inviteLink, isSignedIn, userLoaded, orgListLoaded, success, error, handleJoin])

  // Loading state
  if (inviteLink === undefined || !userLoaded || !orgListLoaded) {
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
  if (!inviteLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Not Found</h1>
            <p className="text-muted-foreground mb-6">
              This invite link is invalid or has been deleted.
            </p>
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Inactive state
  if (!inviteLink.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Disabled</h1>
            <p className="text-muted-foreground mb-6">
              This invite link has been disabled. Please request a new one.
            </p>
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Expired state
  if (inviteLink.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Expired</h1>
            <p className="text-muted-foreground mb-6">
              This invite link has expired. Please request a new one.
            </p>
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Max uses reached state
  if (inviteLink.isMaxedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Link Limit Reached</h1>
            <p className="text-muted-foreground mb-6">
              This invite link has reached its maximum number of uses. Please request a new one.
            </p>
            <Link href="/">
              <Button variant="secondary">Go Home</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Not signed in state
  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border rounded-lg p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-semibold mb-2">Join {inviteLink.orgName}</h1>
              <p className="text-muted-foreground">
                You've been invited to join an organization
              </p>
            </div>

            {/* Org details */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Organization</p>
                  <p className="font-medium">{inviteLink.orgName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Invited by</p>
                  <p className="font-medium">{inviteLink.createdByName}</p>
                </div>
              </div>
            </div>

            {/* Sign in prompt */}
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground mb-4">
                Sign in or create an account to accept this invitation
              </p>
              <Link href={`/sign-in?redirect_url=/app/org-invite/${token}`} className="block">
                <Button className="w-full">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href={`/sign-up?redirect_url=/app/org-invite/${token}`} className="block">
                <Button variant="secondary" className="w-full">
                  Create Account
                </Button>
              </Link>
            </div>
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
            <h1 className="text-xl font-semibold mb-2">
              {isAlreadyMember ? 'Already a Member!' : 'Welcome to the Team!'}
            </h1>
            <p className="text-muted-foreground mb-2">
              {isAlreadyMember
                ? `You're already a member of ${inviteLink.orgName}.`
                : `You've joined ${inviteLink.orgName}.`}
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Main invite card (signed in)
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border rounded-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Join {inviteLink.orgName}</h1>
            <p className="text-muted-foreground">
              You've been invited to join this organization
            </p>
          </div>

          {/* Org details */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="font-medium">{inviteLink.orgName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Invited by</p>
                <p className="font-medium">{inviteLink.createdByName}</p>
              </div>
            </div>
          </div>

          {/* Already member notice */}
          {isAlreadyMember && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You're already a member of this organization. Click below to switch to it.
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
              onClick={handleJoin}
              disabled={isJoining}
            >
              {isJoining
                ? 'Joining...'
                : isAlreadyMember
                ? 'Switch to Organization'
                : 'Join Organization'}
            </Button>
            <Link href="/" className="block">
              <Button variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            By joining, you'll become a member of this organization and gain access to its documents.
          </p>
        </div>
      </div>
    </div>
  )
}
