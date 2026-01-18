'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { Button, Input, useToast } from '@/components/ui'
import { Mail, Copy, Check, Send, ChevronDown } from 'lucide-react'

interface InviteFormProps {
  folderId: string
  orgId?: string
  isOrgAdmin?: boolean
}

export function InviteForm({ folderId, orgId, isOrgAdmin }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'viewer' | 'editor' | 'admin'>('viewer')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { toast } = useToast()
  const createInvitation = useMutation(api.invitations.create)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast({ title: 'Please enter an email address', variant: 'error' })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast({ title: 'Please enter a valid email address', variant: 'error' })
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createInvitation({
        folderId: folderId as Id<'nodes'>,
        email: email.trim(),
        role,
        message: message.trim() || undefined,
        isOrgAdmin,
      })

      const link = `${window.location.origin}/app/invite/${result.token}`
      setInviteLink(link)

      toast({
        title: result.isExisting ? 'Invitation updated' : 'Invitation created',
        description: 'Share the link with the invitee',
        variant: 'success',
      })
    } catch (error: any) {
      toast({
        title: 'Failed to create invitation',
        description: error.message,
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    if (!inviteLink) return

    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      toast({ title: 'Link copied to clipboard', variant: 'success' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: 'Failed to copy link', variant: 'error' })
    }
  }

  const handleReset = () => {
    setEmail('')
    setRole('viewer')
    setMessage('')
    setInviteLink(null)
    setCopied(false)
  }

  const roleOptions = [
    { value: 'viewer', label: 'Viewer', description: 'Can view documents in this folder' },
    { value: 'editor', label: 'Editor', description: 'Can view and edit documents' },
    { value: 'admin', label: 'Admin', description: 'Full access including inviting others' },
  ]

  // Show success state with copy link
  if (inviteLink) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
          <Check className="h-5 w-5" />
          <span className="font-medium">Invitation Created</span>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">
            Share this link with {email}:
          </p>
          <div className="flex gap-2">
            <Input
              value={inviteLink}
              readOnly
              className="text-sm font-mono"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          The invitation link will expire in 7 days. The recipient will need to sign up or sign in to accept.
        </p>

        <Button variant="secondary" onClick={handleReset} className="w-full">
          Invite Another Person
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Email Address
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Permission Level
        </label>
        <div className="relative">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full h-10 px-3 pr-10 text-sm bg-background border border-input rounded-md appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1.5 block">
          Personal Message (Optional)
        </label>
        <textarea
          placeholder="Add a message to include with the invitation..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !email.trim()}
      >
        {isSubmitting ? (
          'Creating Invitation...'
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Create Invitation
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        This will generate a shareable link. You can send it via email, Slack, or any other method.
      </p>
    </form>
  )
}
