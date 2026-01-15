"use client"

import { useCallback, useState, useEffect } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Lib ---
import { isExtensionAvailable } from "@/lib/tiptap-utils"

// --- Icons ---
import { Loader2 } from "lucide-react"

const ERASER_API_URL = "/api/eraser"

export interface UseEraserDiagramConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Whether the button should hide when insertion is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean
  /**
   * Callback function called after a successful diagram insertion.
   */
  onInserted?: () => void
}

/**
 * Checks if image can be inserted in the current editor state
 */
export function canInsertEraserDiagram(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  if (!isExtensionAvailable(editor, "image")) return false

  return editor.can().insertContent({ type: "image" })
}

/**
 * Generates a diagram from text using Eraser.io API via our Next.js API route
 * This avoids CORS issues by proxying through our server
 */
async function generateEraserDiagram(prompt: string): Promise<string> {
  const response = await fetch(ERASER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
    }),
  })

  if (!response.ok) {
    let errorMessage = `API error: ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorMessage
    } catch {
      // If JSON parsing fails, try to get text
      try {
        const errorText = await response.text()
        errorMessage = errorText || errorMessage
      } catch {
        // If text parsing also fails, use default message
      }
    }
    throw new Error(errorMessage)
  }

  const data = await response.json()
  
  // Our API route returns: { imageUrl: "...", createEraserFileUrl: "...", diagrams: [...] }
  if (data.imageUrl) {
    return data.imageUrl
  }

  throw new Error("No image URL found in API response")
}

/**
 * Inserts an Eraser diagram in the editor
 */
export async function insertEraserDiagram(
  editor: Editor | null,
  prompt: string
): Promise<boolean> {
  if (!editor || !editor.isEditable) return false
  if (!canInsertEraserDiagram(editor)) return false

  try {
    const imageUrl = await generateEraserDiagram(prompt)
    
    return editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: imageUrl,
          alt: `Diagram: ${prompt.substring(0, 50)}...`,
        },
      })
      .run()
  } catch (error) {
    console.error("Failed to generate Eraser diagram:", error)
    throw error
  }
}

/**
 * Custom hook that provides Eraser diagram functionality for Tiptap editor
 */
export function useEraserDiagram(config?: UseEraserDiagramConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onInserted,
  } = config || {}

  const { editor } = useTiptapEditor(providedEditor)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedText, setSelectedText] = useState<string>("")
  const [hasSelection, setHasSelection] = useState(false)
  const canInsert = canInsertEraserDiagram(editor)

  // Track selection changes to capture text before button click
  useEffect(() => {
    if (!editor) return

    const updateSelection = () => {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to).trim()
      setSelectedText(text)
      setHasSelection(from !== to && text.length > 0)
    }

    updateSelection()
    editor.on("selectionUpdate", updateSelection)

    return () => {
      editor.off("selectionUpdate", updateSelection)
    }
  }, [editor])

  const handleEraserDiagram = useCallback(async () => {
    if (!editor) return false

    // Use stored selected text (captured before button click)
    const textToUse = selectedText || (() => {
      const { from, to } = editor.state.selection
      return editor.state.doc.textBetween(from, to).trim()
    })()

    if (!textToUse) {
      setError("Please select some text to convert to a diagram")
      setTimeout(() => setError(null), 3000)
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await insertEraserDiagram(editor, textToUse)
      if (success) {
        onInserted?.()
        // Optionally delete the selected text since it's been converted to a diagram
        // editor.chain().deleteSelection().run()
      }
      return success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate diagram"
      setError(errorMessage)
      setTimeout(() => setError(null), 5000)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [editor, onInserted, selectedText])

  const isVisible = hideWhenUnavailable ? hasSelection : true

  return {
    isVisible,
    isLoading,
    error,
    handleEraserDiagram,
    canInsert: canInsert && hasSelection,
    hasSelection,
    label: "Generate diagram from selection",
    Icon: Loader2,
  }
}
