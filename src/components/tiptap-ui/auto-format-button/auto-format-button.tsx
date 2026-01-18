'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'
import { ListIcon } from '@/components/tiptap-icons/list-icon'
import { CheckAiIcon } from '@/components/tiptap-icons/check-ai-icon'
import { XIcon } from '@/components/tiptap-icons/x-icon'

const AUTO_FORMAT_PROMPT = `Format this content with proper structure:
- Use appropriate headings (h1, h2, h3) based on content hierarchy
- Convert lists of items into bullet points or numbered lists
- Use bold for key terms and emphasis
- Use proper paragraph breaks for readability

IMPORTANT: Preserve ALL original content - do not summarize or remove any information. Only improve the structure and formatting.

Content to format:
`

// Safe chunk size - roughly 2500 words or 12000 characters
// This keeps us well within context limits and ensures reliable completion
const MAX_CHUNK_CHARS = 12000
const MAX_CHUNK_WORDS = 2500

interface ChunkInfo {
  text: string
  from: number
  to: number
}

interface ChunkedFormatState {
  chunks: ChunkInfo[]
  currentChunkIndex: number
  totalChunks: number
  isProcessing: boolean
  isCancelled: boolean
}

export interface AutoFormatButtonProps {
  editor?: Editor | null
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

  // If document is small enough, return as single chunk
  if (charCount <= MAX_CHUNK_CHARS && wordCount <= MAX_CHUNK_WORDS) {
    return [{ text, from: docFrom, to: docTo }]
  }

  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/)
  const chunks: ChunkInfo[] = []
  let currentChunk = ''
  let currentWordCount = 0
  let currentFrom = docFrom

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const paraWords = para.split(/\s+/).filter(w => w.length > 0).length
    const paraChars = para.length

    // If adding this paragraph would exceed limits, save current chunk
    if (
      currentChunk &&
      (currentChunk.length + paraChars > MAX_CHUNK_CHARS ||
        currentWordCount + paraWords > MAX_CHUNK_WORDS)
    ) {
      // Calculate approximate position in document
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

    // Add paragraph to current chunk
    currentChunk += (currentChunk ? '\n\n' : '') + para
    currentWordCount += paraWords
  }

  // Don't forget the last chunk
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
  onFormatStarted,
  showLabel = true,
}: AutoFormatButtonProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [aiState, setAiState] = useState({
    isLoading: false,
    hasMessage: false,
  })
  const [chunkedState, setChunkedState] = useState<ChunkedFormatState | null>(null)
  const processingRef = useRef(false)

  // Subscribe to editor state changes for AI status
  useEffect(() => {
    if (!editor) return

    const updateAiState = () => {
      const uiState = editor.storage.uiState
      if (uiState) {
        setAiState({
          isLoading: uiState.aiGenerationIsLoading || false,
          hasMessage: uiState.aiGenerationHasMessage || false,
        })
      }
    }

    editor.on('transaction', updateAiState)
    updateAiState()

    return () => {
      editor.off('transaction', updateAiState)
    }
  }, [editor])

  // Handle chunk completion - auto-accept and process next chunk
  useEffect(() => {
    if (!editor || !chunkedState || chunkedState.isCancelled) return
    if (!aiState.hasMessage || aiState.isLoading) return
    if (processingRef.current) return

    const processNextChunk = async () => {
      processingRef.current = true

      // Accept the current chunk's changes
      if ('aiAccept' in editor.commands) {
        editor.commands.aiAccept()
      }
      if ('aiGenerationHasMessage' in editor.commands) {
        editor.commands.aiGenerationHasMessage(false)
      }

      // Small delay to let the editor settle
      await new Promise(resolve => setTimeout(resolve, 300))

      const nextIndex = chunkedState.currentChunkIndex + 1

      if (nextIndex >= chunkedState.totalChunks) {
        // All chunks done!
        setChunkedState(null)
        processingRef.current = false
        return
      }

      // Process next chunk
      const nextChunk = chunkedState.chunks[nextIndex]

      setChunkedState(prev => prev ? {
        ...prev,
        currentChunkIndex: nextIndex,
      } : null)

      // Wait a bit more before starting next chunk
      await new Promise(resolve => setTimeout(resolve, 200))

      const promptWithContent = AUTO_FORMAT_PROMPT + nextChunk.text

      // Select the chunk's range in the document
      // Note: positions may have shifted, so we need to recalculate
      // For now, we'll select all and process - this is a simplification
      // A more robust solution would track node positions

      editor
        .chain()
        .focus()
        .aiTextPrompt({
          text: promptWithContent,
          stream: true,
          format: 'rich-text',
        })
        .run()

      processingRef.current = false
    }

    processNextChunk()
  }, [editor, chunkedState, aiState.hasMessage, aiState.isLoading])

  const hasSelection = useCallback(() => {
    if (!editor) return false
    const { from, to } = editor.state.selection
    return from !== to
  }, [editor])

  const getContentToFormat = useCallback(() => {
    if (!editor) return { text: '', from: 0, to: 0 }

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

    return { text: textContent, from, to }
  }, [editor, hasSelection])

  const handleFormat = useCallback(() => {
    if (!editor) return
    if (!('aiTextPrompt' in editor.commands)) {
      console.error('AI extension not available')
      return
    }

    const { text, from, to } = getContentToFormat()

    if (!text || text.trim().length === 0) {
      console.warn('No content to format')
      return
    }

    // Split into chunks
    const chunks = splitIntoChunks(text, from, to)

    if (chunks.length > 1) {
      // Multi-chunk formatting
      setChunkedState({
        chunks,
        currentChunkIndex: 0,
        totalChunks: chunks.length,
        isProcessing: true,
        isCancelled: false,
      })

      // Start first chunk
      const firstChunk = chunks[0]
      const promptWithContent = AUTO_FORMAT_PROMPT + firstChunk.text

      editor
        .chain()
        .focus()
        .aiTextPrompt({
          text: promptWithContent,
          stream: true,
          format: 'rich-text',
          insertAt: { from: firstChunk.from, to: firstChunk.to },
        })
        .run()
    } else {
      // Single chunk - normal formatting
      const promptWithContent = AUTO_FORMAT_PROMPT + text

      editor
        .chain()
        .focus()
        .aiTextPrompt({
          text: promptWithContent,
          stream: true,
          format: 'rich-text',
          insertAt: { from, to },
        })
        .run()
    }

    onFormatStarted?.()
  }, [editor, getContentToFormat, onFormatStarted])

  const handleAccept = useCallback(() => {
    if (!editor) return
    if ('aiAccept' in editor.commands) {
      editor.commands.aiAccept()
    }
    if ('aiGenerationHasMessage' in editor.commands) {
      editor.commands.aiGenerationHasMessage(false)
    }
    setChunkedState(null)
  }, [editor])

  const handleReject = useCallback(() => {
    if (!editor) return
    if ('aiReject' in editor.commands) {
      editor.commands.aiReject()
    }
    if ('aiGenerationHasMessage' in editor.commands) {
      editor.commands.aiGenerationHasMessage(false)
    }
    setChunkedState(null)
  }, [editor])

  const handleCancel = useCallback(() => {
    if (!editor) return

    // Mark as cancelled to stop processing more chunks
    setChunkedState(prev => prev ? { ...prev, isCancelled: true } : null)

    // Accept what we have so far (don't lose progress)
    if (aiState.isLoading) {
      // If currently loading, reject/reset the current operation
      if ('aiReject' in editor.commands) {
        editor.commands.aiReject({ type: 'reset' })
      }
    } else if (aiState.hasMessage) {
      // If we have a completed chunk, accept it
      if ('aiAccept' in editor.commands) {
        editor.commands.aiAccept()
      }
    }

    // Reset UI states
    if ('aiGenerationSetIsLoading' in editor.commands) {
      editor.commands.aiGenerationSetIsLoading(false)
    }
    if ('aiGenerationHasMessage' in editor.commands) {
      editor.commands.aiGenerationHasMessage(false)
    }

    // Clear chunked state after a brief delay
    setTimeout(() => {
      setChunkedState(null)
    }, 100)
  }, [editor, aiState.isLoading, aiState.hasMessage])

  if (!editor) return null

  const isEditable = editor.isEditable
  const hasAiExtension = 'aiTextPrompt' in editor.commands
  const canFormat = isEditable && hasAiExtension && !aiState.isLoading && !chunkedState

  // Show Accept/Reject buttons when AI has generated content (single chunk mode)
  if (aiState.hasMessage && !aiState.isLoading && !chunkedState) {
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

  // Show loading state with progress for chunked formatting
  if (aiState.isLoading || chunkedState) {
    const progressText = chunkedState
      ? `Section ${chunkedState.currentChunkIndex + 1}/${chunkedState.totalChunks}`
      : 'Formatting...'

    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-sm bg-blue-600 text-white">
          <ListIcon className="h-4 w-4 animate-pulse" />
          {showLabel && <span>{progressText}</span>}
        </div>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors bg-red-600 hover:bg-red-700 text-white"
          title={chunkedState ? "Stop formatting (keeps completed sections)" : "Cancel formatting"}
        >
          <XIcon className="h-4 w-4" />
          {showLabel && <span>Stop</span>}
        </button>
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
