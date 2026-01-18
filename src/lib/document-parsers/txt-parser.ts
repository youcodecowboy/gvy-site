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

function extractTitle(content: string): string {
  // Use first non-empty line as title
  const firstLine = content.split('\n').find(line => line.trim().length > 0)
  if (firstLine) {
    const text = firstLine.trim()
    return text.length > 50 ? text.substring(0, 50) + '...' : text
  }
  return 'Untitled Document'
}

function countWords(content: string): number {
  return content
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0).length
}

export function parseTxt(content: string): ParseResult {
  // Split by double newlines to create paragraphs
  const paragraphs = content.split(/\n\n+/)

  const html = paragraphs
    .map(p => {
      const trimmed = p.trim()
      if (!trimmed) return ''
      // Convert single newlines to <br> within paragraphs
      const withBreaks = escapeHtml(trimmed).replace(/\n/g, '<br>')
      return `<p>${withBreaks}</p>`
    })
    .filter(p => p.length > 0)
    .join('\n')

  const title = extractTitle(content)
  const wordCount = countWords(content)

  return { html, title, wordCount }
}
