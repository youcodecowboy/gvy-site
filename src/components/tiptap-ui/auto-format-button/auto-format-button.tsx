'use client'

import { useCallback, useEffect, useState } from 'react'
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

export interface AutoFormatButtonProps {
  editor?: Editor | null
  onFormatStarted?: () => void
  showLabel?: boolean
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

    // Update on any transaction
    editor.on('transaction', updateAiState)
    // Initial state
    updateAiState()

    return () => {
      editor.off('transaction', updateAiState)
    }
  }, [editor])

  const hasSelection = useCallback(() => {
    if (!editor) return false
    const { from, to } = editor.state.selection
    return from !== to
  }, [editor])

  const getContentToFormat = useCallback(() => {
    if (!editor) return { text: '', from: 0, to: 0 }

    const hasCurrentSelection = hasSelection()

    if (!hasCurrentSelection) {
      // No selection - select entire document
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

    onFormatStarted?.()
  }, [editor, getContentToFormat, onFormatStarted])

  const handleAccept = useCallback(() => {
    if (!editor) return
    if ('aiAccept' in editor.commands) {
      editor.commands.aiAccept()
    }
    // Reset the hasMessage state so the button returns to default
    if ('aiGenerationHasMessage' in editor.commands) {
      editor.commands.aiGenerationHasMessage(false)
    }
  }, [editor])

  const handleReject = useCallback(() => {
    if (!editor) return
    if ('aiReject' in editor.commands) {
      editor.commands.aiReject()
    }
    // Reset the hasMessage state so the button returns to default
    if ('aiGenerationHasMessage' in editor.commands) {
      editor.commands.aiGenerationHasMessage(false)
    }
  }, [editor])

  const handleCancel = useCallback(() => {
    if (!editor) return
    // Use aiReject with reset type to cancel during loading
    if ('aiReject' in editor.commands) {
      editor.commands.aiReject({ type: 'reset' })
    }
    // Reset UI states
    if ('aiGenerationSetIsLoading' in editor.commands) {
      editor.commands.aiGenerationSetIsLoading(false)
    }
    if ('aiGenerationHasMessage' in editor.commands) {
      editor.commands.aiGenerationHasMessage(false)
    }
  }, [editor])

  if (!editor) return null

  const isEditable = editor.isEditable
  const hasAiExtension = 'aiTextPrompt' in editor.commands
  const canFormat = isEditable && hasAiExtension && !aiState.isLoading

  // Show Accept/Reject buttons when AI has generated content
  if (aiState.hasMessage && !aiState.isLoading) {
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

  // Show loading state with cancel button
  if (aiState.isLoading) {
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-sm bg-blue-600 text-white">
          <ListIcon className="h-4 w-4 animate-pulse" />
          {showLabel && <span>Formatting...</span>}
        </div>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors bg-red-600 hover:bg-red-700 text-white"
          title="Cancel formatting"
        >
          <XIcon className="h-4 w-4" />
          {showLabel && <span>Cancel</span>}
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
