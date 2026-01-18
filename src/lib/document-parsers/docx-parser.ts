import mammoth from 'mammoth'

export interface ParseResult {
  html: string
  title: string
  wordCount: number
}

function extractTitle(html: string): string {
  // Try to extract title from first heading
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].trim()
  }

  const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i)
  if (h2Match) {
    return h2Match[1].trim()
  }

  // Fall back to first paragraph text (truncated)
  const pMatch = html.match(/<p[^>]*>([^<]+)<\/p>/i)
  if (pMatch) {
    const text = pMatch[1].trim()
    return text.length > 50 ? text.substring(0, 50) + '...' : text
  }

  return 'Untitled Document'
}

function countWords(html: string): number {
  // Strip HTML tags and count words
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.split(' ').filter(word => word.length > 0).length
}

export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ],
      // Images are skipped by default when no image handler is provided
    }
  )

  // Log any warnings for debugging
  if (result.messages.length > 0) {
    console.log('DOCX conversion warnings:', result.messages)
  }

  const html = result.value
  const title = extractTitle(html)
  const wordCount = countWords(html)

  return { html, title, wordCount }
}
