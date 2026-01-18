export { parseDocx } from './docx-parser'
export { parseMarkdown } from './markdown-parser'
export { parseTxt } from './txt-parser'
export { parsePdf } from './pdf-parser'

export interface ParseResult {
  html: string
  title: string
  wordCount: number
}

export type SupportedMimeType =
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'application/msword'
  | 'text/plain'
  | 'text/markdown'
  | 'application/pdf'

export const SUPPORTED_EXTENSIONS = ['.docx', '.doc', '.txt', '.md', '.pdf'] as const
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number]

export const MIME_TYPE_MAP: Record<string, SupportedExtension> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'application/pdf': '.pdf',
}

export const EXTENSION_MIME_MAP: Record<SupportedExtension, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.pdf': 'application/pdf',
}

export function getExtensionFromFilename(filename: string): SupportedExtension | null {
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0]
  if (ext && SUPPORTED_EXTENSIONS.includes(ext as SupportedExtension)) {
    return ext as SupportedExtension
  }
  return null
}

export function isSupportedFile(filename: string, mimeType?: string): boolean {
  // Check by extension first
  const ext = getExtensionFromFilename(filename)
  if (ext) return true

  // Fall back to MIME type
  if (mimeType && MIME_TYPE_MAP[mimeType]) return true

  return false
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
