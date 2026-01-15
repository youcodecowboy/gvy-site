import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

const ERASER_API_TOKEN = process.env.ERASER_API_TOKEN || "hg1EiORhH2geuceGETzB"
const ERASER_API_URL = "https://app.eraser.io/api/render/prompt"

/**
 * POST /api/eraser
 * Proxies requests to Eraser.io API to generate diagrams
 * This avoids CORS issues by making the request server-side
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Call Eraser.io API server-side
    // Note: Eraser API expects "text" field, not "prompt"
    const response = await fetch(ERASER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ERASER_API_TOKEN}`,
      },
      body: JSON.stringify({
        text: prompt.trim(),
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Eraser API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Eraser API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Extract image URL from response
    // The API returns: { imageUrl: "...", createEraserFileUrl: "...", diagrams: [...] }
    if (!data.imageUrl) {
      console.error('No imageUrl in Eraser API response:', data)
      return NextResponse.json(
        { error: 'No image URL found in Eraser API response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      imageUrl: data.imageUrl,
      createEraserFileUrl: data.createEraserFileUrl,
      diagrams: data.diagrams,
    })
  } catch (error) {
    console.error('Failed to generate Eraser diagram:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate diagram' },
      { status: 500 }
    )
  }
}
