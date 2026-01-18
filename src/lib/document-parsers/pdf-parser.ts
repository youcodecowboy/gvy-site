export interface ParseResult {
  html: string
  title: string
  wordCount: number
}

interface PdfData {
  text: string
  info?: {
    Title?: string
    [key: string]: unknown
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function extractTitle(text: string, pdfInfo?: PdfData['info']): string {
  // Try PDF metadata first
  if (pdfInfo?.Title && typeof pdfInfo.Title === 'string') {
    return pdfInfo.Title.trim()
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
  // Dynamic import for the pdf-parse module (v2.x with PDFParse class)
  const { PDFParse } = await import('pdf-parse')

  // Convert Buffer to Uint8Array as required by pdfjs-dist
  const uint8Array = new Uint8Array(buffer)

  // Create parser - the library handles loading internally when calling public methods
  const parser = new PDFParse({ data: uint8Array })

  // getText returns a TextResult object with a .text property
  // This also triggers the internal load
  const textResult = await parser.getText()
  const text = textResult.text || ''

  // getInfo returns an InfoResult object - extract the metadata we need
  let info: PdfData['info'] = {}
  try {
    const infoResult = await parser.getInfo()
    // Extract title from the info dictionary if available
    // infoResult.info contains fields like Title, Author, Subject, Creator, etc.
    if (infoResult.info?.Title) {
      info = { Title: String(infoResult.info.Title) }
    }
  } catch {
    // Info might not be available for all PDFs
  }

  const extractedText = text

  // Split into paragraphs - PDFs often have weird spacing
  const paragraphs = extractedText
    .split(/\n\s*\n/)
    .map((p: string) => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p: string) => p.length > 0)

  const html = paragraphs.map((p: string) => `<p>${escapeHtml(p)}</p>`).join('\n')

  const title = extractTitle(extractedText, info)
  const wordCount = countWords(extractedText)

  return { html, title, wordCount }
}
