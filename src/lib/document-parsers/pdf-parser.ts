export interface ParseResult {
  html: string
  title: string
  wordCount: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function extractTitle(text: string, metadata?: { title?: string }): string {
  // Try PDF metadata first
  if (metadata?.title && typeof metadata.title === 'string') {
    return metadata.title.trim()
  }

  // Fall back to first line of text
  const firstLine = text.split('\n').find((line: string) => line.trim().length > 0)
  if (firstLine) {
    const trimmed = firstLine.trim()
    return trimmed.length > 50 ? trimmed.substring(0, 50) + '...' : trimmed
  }

  return 'Untitled Document'
}

function countWords(text: string): number {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word: string) => word.length > 0).length
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Use unpdf which is designed for serverless/edge environments
  const { extractText, getMeta } = await import('unpdf')

  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(buffer)

  // Extract text from PDF - returns array of strings (one per page)
  const { text } = await extractText(uint8Array)
  // Join pages with double newlines to preserve page breaks
  const extractedText = Array.isArray(text) ? text.join('\n\n') : (text || '')

  // Try to get metadata
  let metadata: { title?: string } = {}
  try {
    const meta = await getMeta(uint8Array)
    if (meta.info?.Title) {
      metadata = { title: String(meta.info.Title) }
    }
  } catch {
    // Metadata might not be available for all PDFs
  }

  // Split into paragraphs - PDFs often have weird spacing
  const paragraphs = extractedText
    .split(/\n\s*\n/)
    .map((p: string) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p: string) => p.length > 0)

  const html = paragraphs.map((p: string) => `<p>${escapeHtml(p)}</p>`).join('\n')

  const title = extractTitle(extractedText, metadata)
  const wordCount = countWords(extractedText)

  return { html, title, wordCount }
}
