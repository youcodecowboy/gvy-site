'use client'

import { useState, useCallback, useEffect } from 'react'
import { type Editor } from '@tiptap/react'
import { useAction } from 'convex/react'
import {
  Sparkles,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Wand2,
  MessageSquare,
  Languages,
  ChevronRight,
  X,
} from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

// Icons
import { AiSparklesIcon } from '@/components/tiptap-icons/ai-sparkles-icon'
import { CheckAiIcon } from '@/components/tiptap-icons/check-ai-icon'
import { TextExtendIcon } from '@/components/tiptap-icons/text-extend-icon'
import { TextReduceIcon } from '@/components/tiptap-icons/text-reduce-icon'
import { Simplify2Icon } from '@/components/tiptap-icons/simplify-2-icon'
import { MicAiIcon } from '@/components/tiptap-icons/mic-ai-icon'

// UI Primitives
import { Button, ButtonGroup } from '@/components/tiptap-ui-primitive/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/tiptap-ui-primitive/dropdown-menu'
import { Card, CardBody } from '@/components/tiptap-ui-primitive/card'
import { Separator } from '@/components/tiptap-ui-primitive/separator'

// Hooks
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'

type AIMode = 'improve' | 'shorter' | 'longer' | 'formal' | 'casual' | 'fix_grammar' | 'simplify' | 'continue' | 'custom'

interface AIInlineMenuProps {
  editor?: Editor | null
  docId?: string
  hideWhenUnavailable?: boolean
}

// Check if AI can be used with current selection
function canUseAi(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  const { selection } = editor.state
  if (selection.empty) return false
  return true
}

export function AIInlineMenu({
  editor: providedEditor,
  docId,
  hideWhenUnavailable = false,
}: AIInlineMenuProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  const inlineEdit = useAction(api.ai.inlineEdit)

  const isDisabled = !canUseAi(editor)

  // Update visibility based on selection
  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      if (hideWhenUnavailable) {
        setIsVisible(canUseAi(editor))
      }
    }

    handleSelectionUpdate()
    editor.on('selectionUpdate', handleSelectionUpdate)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  // Get selected text
  const getSelectedText = useCallback(() => {
    if (!editor) return ''
    const { from, to } = editor.state.selection
    return editor.state.doc.textBetween(from, to, ' ')
  }, [editor])

  // Execute AI transformation
  const executeAI = useCallback(async (mode: AIMode, instruction?: string) => {
    if (!editor || isLoading) return

    const selectedText = getSelectedText()
    if (!selectedText) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await inlineEdit({
        selectedText,
        instruction: instruction || '',
        documentId: docId as Id<'nodes'> | undefined,
        mode,
      })

      setResult(response)
    } catch (error) {
      console.error('AI inline edit error:', error)
      setResult('Error: Failed to process. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [editor, isLoading, getSelectedText, inlineEdit, docId])

  // Apply result to editor
  const applyResult = useCallback(() => {
    if (!editor || !result) return

    // Replace selection with the AI-generated content
    editor.chain().focus().insertContent(result).run()

    // Reset state
    setResult(null)
    setIsOpen(false)
    setShowCustomInput(false)
    setCustomPrompt('')
  }, [editor, result])

  // Discard result
  const discardResult = useCallback(() => {
    setResult(null)
    setShowCustomInput(false)
    setCustomPrompt('')
  }, [])

  // Handle custom prompt submission
  const handleCustomSubmit = useCallback(() => {
    if (customPrompt.trim()) {
      executeAI('custom', customPrompt.trim())
      setShowCustomInput(false)
    }
  }, [customPrompt, executeAI])

  if (!isVisible || !editor || !editor.isEditable) {
    return null
  }

  // If we have a result, show the result preview
  if (result) {
    return (
      <DropdownMenu modal open={true} onOpenChange={() => {}}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            data-style="ghost"
            disabled={true}
            role="button"
            tabIndex={-1}
            aria-label="AI"
            tooltip="AI"
          >
            <AiSparklesIcon className="tiptap-button-icon" />
            <span className="tiptap-button-text">AI</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <Card>
            <CardBody>
              <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Result
                  </span>
                </div>
                <div className="text-sm max-h-40 overflow-y-auto whitespace-pre-wrap bg-muted/30 p-2 rounded mb-3">
                  {result}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={discardResult}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Discard
                  </Button>
                  <Button
                    type="button"
                    data-style="primary"
                    onClick={applyResult}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // If loading, show loading state
  if (isLoading) {
    return (
      <Button
        type="button"
        data-style="ghost"
        disabled={true}
        role="button"
        tabIndex={-1}
        aria-label="AI Processing"
        tooltip="AI Processing"
      >
        <Loader2 className="tiptap-button-icon animate-spin" />
        <span className="tiptap-button-text">Processing...</span>
      </Button>
    )
  }

  return (
    <DropdownMenu modal open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          disabled={isDisabled}
          data-disabled={isDisabled}
          role="button"
          tabIndex={-1}
          aria-label="AI"
          tooltip="AI"
        >
          <AiSparklesIcon className="tiptap-button-icon" />
          <span className="tiptap-button-text">AI</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <Card>
          <CardBody>
            {showCustomInput ? (
              <div className="p-2 w-64">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="What would you like AI to do with this text?"
                  className="w-full min-h-[60px] p-2 text-sm bg-muted/30 border border-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleCustomSubmit()
                    }
                    if (e.key === 'Escape') {
                      setShowCustomInput(false)
                      setCustomPrompt('')
                    }
                  }}
                />
                <div className="flex gap-2 mt-2 justify-end">
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomPrompt('')
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    data-style="primary"
                    onClick={handleCustomSubmit}
                    disabled={!customPrompt.trim()}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Apply
                  </Button>
                </div>
              </div>
            ) : (
              <ButtonGroup>
                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('improve')}
                  >
                    <Wand2 className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Improve writing</span>
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('fix_grammar')}
                  >
                    <CheckAiIcon className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Fix grammar</span>
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('shorter')}
                  >
                    <TextReduceIcon className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Make shorter</span>
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('longer')}
                  >
                    <TextExtendIcon className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Make longer</span>
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('simplify')}
                  >
                    <Simplify2Icon className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Simplify</span>
                  </Button>
                </DropdownMenuItem>

                <Separator orientation="horizontal" />

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('formal')}
                  >
                    <MicAiIcon className="tiptap-button-icon" />
                    <span className="tiptap-button-text">More formal</span>
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('casual')}
                  >
                    <MicAiIcon className="tiptap-button-icon" />
                    <span className="tiptap-button-text">More casual</span>
                  </Button>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => executeAI('continue')}
                  >
                    <ArrowRight className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Continue writing</span>
                  </Button>
                </DropdownMenuItem>

                <Separator orientation="horizontal" />

                <DropdownMenuItem asChild>
                  <Button
                    type="button"
                    data-style="ghost"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <MessageSquare className="tiptap-button-icon" />
                    <span className="tiptap-button-text">Custom instruction...</span>
                  </Button>
                </DropdownMenuItem>
              </ButtonGroup>
            )}
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AIInlineMenu
