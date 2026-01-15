import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Use the Document Server ID for the REST API
const TIPTAP_DOC_SERVER_ID = process.env.NEXT_PUBLIC_TIPTAP_DOC_SERVER_ID || process.env.TIPTAP_DOC_SERVER_ID
// The API secret for REST API calls (different from JWT secret)
const TIPTAP_API_SECRET = process.env.TIPTAP_DOC_SECRET

// TipTap Cloud Document API base URL
const getDocumentApiUrl = (documentName: string) => 
  `https://${TIPTAP_DOC_SERVER_ID}.collab.tiptap.cloud/api/documents/${encodeURIComponent(documentName)}`

/**
 * GET /api/documents?name=docName
 * Fetches a document from TipTap Cloud
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const name = request.nextUrl.searchParams.get('name')
    if (!name) {
      return NextResponse.json({ error: 'Document name required' }, { status: 400 })
    }

    if (!TIPTAP_API_SECRET || !TIPTAP_DOC_SERVER_ID) {
      console.error('Document service not configured:', { hasSecret: !!TIPTAP_API_SECRET, serverId: TIPTAP_DOC_SERVER_ID })
      return NextResponse.json(
        { error: 'Document service not configured' },
        { status: 500 }
      )
    }

    const url = `${getDocumentApiUrl(name)}?format=json`
    console.log('Fetching document from:', url)
    
    const response = await fetch(url, {
      headers: {
        Authorization: TIPTAP_API_SECRET,
      },
    })

    if (response.status === 404) {
      return NextResponse.json({ exists: false, content: null })
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TipTap Cloud error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: response.status }
      )
    }

    const content = await response.json()
    return NextResponse.json({ exists: true, content })
  } catch (error) {
    console.error('Failed to fetch document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/documents
 * Creates or updates a document in TipTap Cloud
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, content } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: 'Document name required' }, { status: 400 })
    }

    if (!TIPTAP_API_SECRET || !TIPTAP_DOC_SERVER_ID) {
      console.error('Document service not configured:', { hasSecret: !!TIPTAP_API_SECRET, serverId: TIPTAP_DOC_SERVER_ID })
      return NextResponse.json(
        { error: 'Document service not configured' },
        { status: 500 }
      )
    }

    // Create/update the document in TipTap Cloud
    const url = `${getDocumentApiUrl(name)}?format=json`
    console.log('Saving document to:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: TIPTAP_API_SECRET,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(content),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TipTap Cloud error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save document:', error)
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/documents?name=docName
 * Deletes a document from TipTap Cloud
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const name = request.nextUrl.searchParams.get('name')
    if (!name) {
      return NextResponse.json({ error: 'Document name required' }, { status: 400 })
    }

    if (!TIPTAP_API_SECRET || !TIPTAP_DOC_SERVER_ID) {
      console.error('Document service not configured:', { hasSecret: !!TIPTAP_API_SECRET, serverId: TIPTAP_DOC_SERVER_ID })
      return NextResponse.json(
        { error: 'Document service not configured' },
        { status: 500 }
      )
    }

    const url = getDocumentApiUrl(name)
    console.log('Deleting document:', url)
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: TIPTAP_API_SECRET,
      },
    })

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      console.error('TipTap Cloud error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
