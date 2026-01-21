import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Validate the upload request here if needed
        // You could add auth checks, file type validation, etc.
        return {
          allowedContentTypes: [
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/pdf',
            'text/plain',
            'text/markdown',
          ],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // This runs after the file is uploaded to blob storage
        console.log('Blob upload completed:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error('Blob upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 }
    )
  }
}
