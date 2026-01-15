import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import jwt from 'jsonwebtoken'

/**
 * POST /api/collaboration
 * Generates a JWT token for TipTap Collaboration features
 */
export async function POST() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const secret = process.env.TIPTAP_COLLAB_SECRET
    
    if (!secret) {
      console.error('TIPTAP_COLLAB_SECRET not configured')
      return NextResponse.json(
        { error: 'Collaboration service not configured' },
        { status: 500 }
      )
    }

    // Create JWT payload
    // See: https://tiptap.dev/docs/collaboration/getting-started/authenticate
    const now = Math.floor(Date.now() / 1000)
    // Use the Document Server ID (v91xdv2m)
    const appId = process.env.NEXT_PUBLIC_TIPTAP_DOC_SERVER_ID || process.env.TIPTAP_DOC_SERVER_ID
    
    if (!appId) {
      console.error('NEXT_PUBLIC_TIPTAP_DOC_SERVER_ID not configured')
      return NextResponse.json(
        { error: 'Server ID not configured' },
        { status: 500 }
      )
    }
    
    const payload = {
      iat: now,
      nbf: now,
      exp: now + (24 * 60 * 60), // 24 hours
      iss: appId,
      aud: appId,
    }
    
    console.log('Generating JWT for app:', appId)

    // Sign the token
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
    })

    console.log('Generated collaboration JWT for user:', userId)
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Failed to generate collaboration token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
