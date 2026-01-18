import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

/**
 * POST /api/org-invite/join
 * Joins the current user to an organization via invite link
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Get the invite link details from Convex
    const inviteLink = await convex.query(api.orgInvites.getByToken, { token })

    if (!inviteLink) {
      return NextResponse.json({ error: 'Invite link not found' }, { status: 404 })
    }

    if (!inviteLink.isUsable) {
      if (inviteLink.isExpired) {
        return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 })
      }
      if (inviteLink.isMaxedOut) {
        return NextResponse.json({ error: 'This invite link has reached its maximum uses' }, { status: 400 })
      }
      if (!inviteLink.isActive) {
        return NextResponse.json({ error: 'This invite link has been disabled' }, { status: 400 })
      }
    }

    const client = await clerkClient()

    // Check if user is already a member
    try {
      const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId: inviteLink.orgId,
      })

      const isMember = memberships.data.some(
        (m) => m.publicUserData?.userId === userId
      )

      if (isMember) {
        return NextResponse.json({
          success: true,
          alreadyMember: true,
          orgId: inviteLink.orgId
        })
      }
    } catch (err) {
      // If we can't check membership, continue to try adding
      console.log('Could not check existing membership:', err)
    }

    // Add the user to the organization
    await client.organizations.createOrganizationMembership({
      organizationId: inviteLink.orgId,
      userId: userId,
      role: inviteLink.defaultRole as 'org:admin' | 'org:member',
    })

    return NextResponse.json({
      success: true,
      orgId: inviteLink.orgId,
      orgName: inviteLink.orgName
    })
  } catch (error: any) {
    console.error('Failed to join organization:', error)

    // Check for specific Clerk errors
    if (error?.errors?.[0]?.code === 'member_already_exists') {
      return NextResponse.json({
        success: true,
        alreadyMember: true
      })
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to join organization' },
      { status: 500 }
    )
  }
}
