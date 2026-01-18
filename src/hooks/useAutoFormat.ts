'use client'

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'

const AUTO_FORMAT_INSTRUCTIONS = `Format this document with proper structure and formatting:
- Use appropriate headings (h1, h2, h3) based on content hierarchy
- Convert lists of items into bullet points or numbered lists
- Use bold for key terms and emphasis
- Use proper paragraph breaks for readability

IMPORTANT: Preserve ALL original content - do not summarize, shorten, or remove any information. Only improve the structure and formatting.

Document to format:
`

export function useAutoFormat(editor: Editor | null) {
  const [isFormatting, setIsFormatting] = useState(false)

  const autoFormat = useCallback(() => {
    if (!editor || isFormatting) return

    // Check if AI extension is available
    if (!('aiTextPrompt' in editor.commands)) {
      console.error('AI extension not available')
      return
    }

    setIsFormatting(true)

    try {
      // Select all content
      editor.commands.selectAll()

      // Get the selected content
      const { state } = editor
      const { from, to } = state.selection
      const selectionContent = state.selection.content()

      // Get text content
      const textContent = selectionContent.content.textBetween(
        0,
        selectionContent.content.size,
        '\n'
      )

      if (!textContent || textContent.trim().length === 0) {
        console.warn('No content to format')
        setIsFormatting(false)
        return
      }

      // Combine instructions with content
      const promptWithContent = AUTO_FORMAT_INSTRUCTIONS + textContent

      // Run the AI formatting - will replace the selected content
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

      // The AI extension handles loading states internally
      // Reset our local state after triggering
      setTimeout(() => {
        setIsFormatting(false)
      }, 500)
    } catch (error) {
      console.error('Auto-format error:', error)
      setIsFormatting(false)
    }
  }, [editor, isFormatting])

  const canAutoFormat = Boolean(
    editor &&
    editor.isEditable &&
    'aiTextPrompt' in editor.commands &&
    !isFormatting
  )

  return {
    autoFormat,
    isFormatting,
    canAutoFormat,
  }
}
