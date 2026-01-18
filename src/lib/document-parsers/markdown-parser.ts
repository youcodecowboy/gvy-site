import { marked } from 'marked'

export interface ParseResult {
  html: string
  title: string
  wordCount: number
}

function extractTitle(html: string, rawContent: string): string {
  // Try to extract title from first heading in HTML
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) {
    return h1Match[1].trim()
  }

  const h2Match = html.match(/<h2[^>]*>([^<]+)<\/h2>/i)
  if (h2Match) {
    return h2Match[1].trim()
  }

  // Try markdown heading syntax from raw content
  const mdH1Match = rawContent.match(/^#\s+(.+)$/m)
  if (mdH1Match) {
    return mdH1Match[1].trim()
  }

  const mdH2Match = rawContent.match(/^##\s+(.+)$/m)
  if (mdH2Match) {
    return mdH2Match[1].trim()
  }

  // Fall back to first line of content
  const firstLine = rawContent.split('\n').find(line => line.trim().length > 0)
  if (firstLine) {
    const text = firstLine.trim()
    return text.length > 50 ? text.substring(0, 50) + '...' : text
  }

  return 'Untitled Document'
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.split(' ').filter(word => word.length > 0).length
}

export async function parseMarkdown(content: string): Promise<ParseResult> {
  // Configure marked for GitHub Flavored Markdown
  marked.use({
    gfm: true,
    breaks: true,
  })

  // Convert task list syntax to proper HTML
  const processedContent = content.replace(
    /^(\s*)-\s*\[([ xX])\]\s+(.*)$/gm,
    (_, indent, checked, text) => {
      const isChecked = checked.toLowerCase() === 'x'
      return `${indent}<li data-type="taskItem" data-checked="${isChecked}">${text}</li>`
    }
  )

  const html = await marked.parse(processedContent)

  const title = extractTitle(html, content)
  const wordCount = countWords(html)

  return { html, title, wordCount }
}
