import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import jwt from 'jsonwebtoken'

/**
 * POST /api/ai
 * Generates a JWT token for TipTap AI features
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

    // AI uses its own secret (separate from collaboration)
    const secret = process.env.TIPTAP_AI_SECRET
    const appId = process.env.NEXT_PUBLIC_TIPTAP_AI_APP_ID
    
    if (!secret) {
      console.error('TIPTAP_AI_SECRET not configured')
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 500 }
      )
    }

    // Create JWT payload with proper claims
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iat: now,
      nbf: now,
      exp: now + (24 * 60 * 60), // 24 hours
      iss: appId,
      aud: appId,
    }

    // Sign the token with HS256
    const token = jwt.sign(payload, secret, {
      algorithm: 'HS256',
    })

    console.log('Generated AI JWT for user:', userId, 'appId:', appId)
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Failed to generate AI token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
