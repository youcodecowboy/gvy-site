import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import {
  parseDocx,
  parseMarkdown,
  parseTxt,
  parsePdf,
  getExtensionFromFilename,
  MAX_FILE_SIZE,
  SUPPORTED_EXTENSIONS,
} from '@/lib/document-parsers'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  let blobUrl: string | null = null

  try {
    const body = await request.json()
    const { url, filename, size } = body as {
      url: string
      filename: string
      size: number
    }

    if (!url || !filename) {
      return NextResponse.json(
        { error: 'Missing url or filename' },
        { status: 400 }
      )
    }

    blobUrl = url

    // Validate file size
    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    // Get file extension
    const extension = getExtensionFromFilename(filename)

    if (!extension) {
      return NextResponse.json(
        {
          error: `Unsupported file type. Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`,
        },
        { status: 400 }
      )
    }

    // Handle legacy .doc files
    if (extension === '.doc') {
      return NextResponse.json(
        {
          error:
            'Legacy .doc format is not supported. Please convert to .docx using Microsoft Word or Google Docs.',
          code: 'LEGACY_DOC_FORMAT',
        },
        { status: 400 }
      )
    }

    // Download file from blob storage
    const blobResponse = await fetch(url)
    if (!blobResponse.ok) {
      throw new Error('Failed to download file from storage')
    }

    const arrayBuffer = await blobResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let result: { html: string; title: string; wordCount: number }

    switch (extension) {
      case '.docx':
        result = await parseDocx(buffer)
        break
      case '.md':
        const mdContent = buffer.toString('utf-8')
        result = await parseMarkdown(mdContent)
        break
      case '.txt':
        const txtContent = buffer.toString('utf-8')
        result = parseTxt(txtContent)
        break
      case '.pdf':
        result = await parsePdf(buffer)
        break
      default:
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    // Clean up the blob after successful processing
    try {
      await del(url)
    } catch (delError) {
      console.warn('Failed to delete blob:', delError)
    }

    return NextResponse.json({
      html: result.html,
      metadata: {
        title: result.title,
        wordCount: result.wordCount,
        originalFileName: filename,
        fileSize: size,
        fileType: extension,
      },
    })
  } catch (error) {
    // Try to clean up blob on error too
    if (blobUrl) {
      try {
        await del(blobUrl)
      } catch (delError) {
        console.warn('Failed to delete blob on error:', delError)
      }
    }
    console.error('Error parsing file:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')

    // Handle specific error types
    if (error instanceof Error) {
      const message = error.message.toLowerCase()

      if (message.includes('password')) {
        return NextResponse.json(
          { error: 'Password-protected files are not supported' },
          { status: 400 }
        )
      }

      // Handle our custom validation error (from magic byte check)
      if (message.includes('invalid docx file')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      // Handle common mammoth/ZIP parsing errors
      if (
        message.includes('end of central directory') ||
        message.includes('not a valid zip') ||
        message.includes('invalid zip')
      ) {
        return NextResponse.json(
          {
            error: 'This file is not a valid DOCX document. It may have been renamed from another format. Please upload a genuine .docx file.'
          },
          { status: 400 }
        )
      }

      if (message.includes('corrupt') || message.includes('invalid')) {
        return NextResponse.json(
          { error: 'The file appears to be corrupted or invalid' },
          { status: 400 }
        )
      }

      // Return user-friendly error with debugging info
      return NextResponse.json(
        { error: `Failed to parse file: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to parse file. Please try again.' },
      { status: 500 }
    )
  }
}
