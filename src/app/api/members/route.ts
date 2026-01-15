import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

/**
 * GET /api/members
 * Fetches organization members for @mentions
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = request.nextUrl.searchParams.get('query') || ''
    const members: Array<{
      id: string
      name: string
      email: string
      imageUrl: string
      role: string
    }> = []

    // If user is in an organization, fetch org members
    if (orgId) {
      const client = await clerkClient()
      const orgMembers = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 50,
      })

      for (const membership of orgMembers.data) {
        const user = membership.publicUserData
        if (user) {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                       user.identifier || 
                       'Unknown'
          
          // Filter by query if provided
          if (query && !name.toLowerCase().includes(query.toLowerCase())) {
            continue
          }

          members.push({
            id: user.userId || membership.id,
            name,
            email: user.identifier || '',
            imageUrl: user.imageUrl || '',
            role: membership.role || 'member',
          })
        }
      }
    } else {
      // If not in an org, just return the current user
      const client = await clerkClient()
      const user = await client.users.getUser(userId)
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                   user.username || 
                   'You'
      
      if (!query || name.toLowerCase().includes(query.toLowerCase())) {
        members.push({
          id: user.id,
          name,
          email: user.emailAddresses[0]?.emailAddress || '',
          imageUrl: user.imageUrl || '',
          role: 'owner',
        })
      }
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
