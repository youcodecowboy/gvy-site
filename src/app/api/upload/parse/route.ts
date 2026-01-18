import { NextRequest, NextResponse } from 'next/server'
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
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      )
    }

    // Get file extension
    const extension = getExtensionFromFilename(file.name)

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

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
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

    return NextResponse.json({
      html: result.html,
      metadata: {
        title: result.title,
        wordCount: result.wordCount,
        originalFileName: file.name,
        fileSize: file.size,
        fileType: extension,
      },
    })
  } catch (error) {
    console.error('Error parsing file:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('password')) {
        return NextResponse.json(
          { error: 'Password-protected files are not supported' },
          { status: 400 }
        )
      }
      if (error.message.includes('corrupt') || error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'The file appears to be corrupted or invalid' },
          { status: 400 }
        )
      }
      // Return the actual error message for debugging
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
