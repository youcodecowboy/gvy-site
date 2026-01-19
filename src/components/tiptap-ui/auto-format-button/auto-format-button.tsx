'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import type { Id } from '../../../../convex/_generated/dataModel'
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'
import { ListIcon } from '@/components/tiptap-icons/list-icon'
import { CheckAiIcon } from '@/components/tiptap-icons/check-ai-icon'
import { XIcon } from '@/components/tiptap-icons/x-icon'

const MAX_CHUNK_CHARS = 12000
const MAX_CHUNK_WORDS = 2500

interface ChunkInfo {
  text: string
  from: number
  to: number
}

export interface AutoFormatButtonProps {
  editor?: Editor | null
  docId?: string
  onFormatStarted?: () => void
  showLabel?: boolean
}

// Split text into chunks at paragraph boundaries
function splitIntoChunks(
  text: string,
  docFrom: number,
  docTo: number
): ChunkInfo[] {
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
  const charCount = text.length

  if (charCount <= MAX_CHUNK_CHARS && wordCount <= MAX_CHUNK_WORDS) {
    return [{ text, from: docFrom, to: docTo }]
  }

  const paragraphs = text.split(/\n\n+/)
  const chunks: ChunkInfo[] = []
  let currentChunk = ''
  let currentWordCount = 0
  let currentFrom = docFrom

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const paraWords = para.split(/\s+/).filter(w => w.length > 0).length
    const paraChars = para.length

    if (
      currentChunk &&
      (currentChunk.length + paraChars > MAX_CHUNK_CHARS ||
        currentWordCount + paraWords > MAX_CHUNK_WORDS)
    ) {
      const chunkEnd = currentFrom + currentChunk.length
      chunks.push({
        text: currentChunk.trim(),
        from: currentFrom,
        to: chunkEnd,
      })
      currentFrom = chunkEnd
      currentChunk = ''
      currentWordCount = 0
    }

    currentChunk += (currentChunk ? '\n\n' : '') + para
    currentWordCount += paraWords
  }

  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      from: currentFrom,
      to: docTo,
    })
  }

  return chunks
}

export function AutoFormatButton({
  editor: providedEditor,
  docId,
  onFormatStarted,
  showLabel = true,
}: AutoFormatButtonProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const autoFormat = useAction(api.ai.autoFormat)

  const [isLoading, setIsLoading] = useState(false)
  const [formattedContent, setFormattedContent] = useState<any | null>(null)
  const [originalContent, setOriginalContent] = useState<any | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const hasSelection = useCallback(() => {
    if (!editor) return false
    const { from, to } = editor.state.selection
    return from !== to
  }, [editor])

  const getContentToFormat = useCallback(() => {
    if (!editor) return { text: '', from: 0, to: 0, isFullDocument: true }

    const hasCurrentSelection = hasSelection()

    if (!hasCurrentSelection) {
      editor.commands.selectAll()
    }

    const { state } = editor
    const { from, to } = state.selection
    const selectionContent = state.selection.content()

    const textContent = selectionContent.content.textBetween(
      0,
      selectionContent.content.size,
      '\n'
    )

    return { text: textContent, from, to, isFullDocument: !hasCurrentSelection }
  }, [editor, hasSelection])

  const handleFormat = useCallback(async () => {
    if (!editor) return

    const { text, from, to, isFullDocument } = getContentToFormat()

    if (!text || text.trim().length === 0) {
      console.warn('No content to format')
      return
    }

    // Save original content for potential reject
    setOriginalContent(editor.getJSON())
    setIsLoading(true)
    onFormatStarted?.()

    try {
      // Split into chunks
      const chunks = splitIntoChunks(text, from, to)
      setProgress({ current: 0, total: chunks.length })

      let formattedNodes: any[] = []

      if (chunks.length === 1) {
        // Single chunk - simple case
        const result = await autoFormat({
          text: chunks[0].text,
          documentId: docId as Id<'nodes'> | undefined,
        })

        if (result.success && result.content) {
          if (isFullDocument) {
            // Replace entire document
            editor.commands.setContent(result.content)
            setFormattedContent(result.content)
          } else {
            // Replace only the selection
            formattedNodes = result.content.content || []
            editor.chain()
              .focus()
              .deleteRange({ from, to })
              .insertContentAt(from, formattedNodes)
              .run()
            setFormattedContent(result.content)
          }
        } else {
          console.error('Auto-format failed:', result.error)
        }
      } else {
        // Multiple chunks - process sequentially and merge
        for (let i = 0; i < chunks.length; i++) {
          setProgress({ current: i + 1, total: chunks.length })

          const result = await autoFormat({
            text: chunks[i].text,
            documentId: docId as Id<'nodes'> | undefined,
          })

          if (result.success && result.content) {
            // Extract the content array from the doc
            if (result.content.content) {
              formattedNodes.push(...result.content.content)
            }
          } else {
            console.error(`Failed to format chunk ${i + 1}:`, result.error)
            // Fallback: wrap the chunk text in paragraphs
            const paragraphs = chunks[i].text.split('\n\n').filter(p => p.trim())
            formattedNodes.push(...paragraphs.map(p => ({
              type: 'paragraph',
              content: [{ type: 'text', text: p.trim() }]
            })))
          }
        }

        // Merge all chunks into a single document
        const mergedContent = {
          type: 'doc',
          content: formattedNodes
        }

        if (isFullDocument) {
          editor.commands.setContent(mergedContent)
        } else {
          // Replace only the selection
          editor.chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, formattedNodes)
            .run()
        }
        setFormattedContent(mergedContent)
      }
    } catch (error) {
      console.error('Auto-format error:', error)
    } finally {
      setIsLoading(false)
      setProgress({ current: 0, total: 0 })
    }
  }, [editor, getContentToFormat, autoFormat, docId, onFormatStarted])

  const handleAccept = useCallback(() => {
    // Changes are already applied, just clear the state
    setFormattedContent(null)
    setOriginalContent(null)
  }, [])

  const handleReject = useCallback(() => {
    if (!editor || !originalContent) return
    // Restore original content
    editor.commands.setContent(originalContent)
    setFormattedContent(null)
    setOriginalContent(null)
  }, [editor, originalContent])

  if (!editor) return null

  const isEditable = editor.isEditable
  const canFormat = isEditable && !isLoading && !formattedContent

  // Show Accept/Reject buttons when AI has generated content
  if (formattedContent && !isLoading) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleAccept}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors bg-green-600 hover:bg-green-700 text-white"
          title="Accept AI changes"
        >
          <CheckAiIcon className="h-4 w-4" />
          {showLabel && <span>Accept</span>}
        </button>
        <button
          onClick={handleReject}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors bg-red-600 hover:bg-red-700 text-white"
          title="Reject AI changes"
        >
          <XIcon className="h-4 w-4" />
          {showLabel && <span>Reject</span>}
        </button>
      </div>
    )
  }

  // Show loading state with progress
  if (isLoading) {
    const progressText = progress.total > 1
      ? `Section ${progress.current}/${progress.total}`
      : 'Formatting...'

    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-sm bg-blue-600 text-white">
          <ListIcon className="h-4 w-4 animate-pulse" />
          {showLabel && <span>{progressText}</span>}
        </div>
      </div>
    )
  }

  // Default state - show Auto Format button
  return (
    <button
      onClick={handleFormat}
      disabled={!canFormat}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors
        ${canFormat
          ? 'hover:bg-accent text-muted-foreground hover:text-foreground'
          : 'opacity-50 cursor-not-allowed text-muted-foreground'
        }
      `}
      title={hasSelection() ? 'Auto Format selection with AI' : 'Auto Format entire document with AI'}
    >
      <ListIcon className="h-4 w-4" />
      {showLabel && <span>Auto Format</span>}
    </button>
  )
}
