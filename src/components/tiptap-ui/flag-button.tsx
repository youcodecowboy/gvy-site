'use client'

import { useState, useEffect } from 'react'
import { type Editor } from '@tiptap/react'
import { Flag } from 'lucide-react'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { FlagPopover } from './flag-popover/flag-popover'

interface FlagButtonProps {
  editor: Editor | null
  docId?: string
}

export function FlagButton({ editor, docId }: FlagButtonProps) {
  const [canFlag, setCanFlag] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const [selectionData, setSelectionData] = useState<{
    from: number
    to: number
    selectedText: string
  } | null>(null)

  useEffect(() => {
    if (!editor) return

    const updateCanFlag = () => {
      const { from, to } = editor.state.selection
      // Can flag if there's a text selection
      setCanFlag(from !== to && editor.isEditable)
    }

    updateCanFlag()
    editor.on('selectionUpdate', updateCanFlag)

    return () => {
      editor.off('selectionUpdate', updateCanFlag)
    }
  }, [editor])

  if (!canFlag || !editor || !docId) {
    return null
  }

  const handleClick = () => {
    // Get selection data
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to, ' ')

    // Store selection data
    setSelectionData({
      from,
      to,
      selectedText,
    })

    // Get selection position from the editor view
    try {
      const start = editor.view.coordsAtPos(from)
      const end = editor.view.coordsAtPos(to)

      // Position below the selection
      setPopoverPosition({
        top: Math.max(start.bottom, end.bottom) + 8,
        left: Math.min(start.left, end.left),
      })
      setShowPopover(true)
    } catch (e) {
      // Fallback to selection API
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setPopoverPosition({
          top: rect.bottom + 8,
          left: rect.left,
        })
        setShowPopover(true)
      }
    }
  }

  return (
    <>
      <Button
        type="button"
        data-style="ghost"
        onClick={handleClick}
        tooltip="Flag for someone"
      >
        <Flag className="tiptap-button-icon h-4 w-4" />
      </Button>
      {showPopover && popoverPosition && selectionData && (
        <FlagPopover
          docId={docId}
          type="inline"
          selectionData={selectionData}
          position={popoverPosition}
          onClose={() => {
            setShowPopover(false)
            setSelectionData(null)
          }}
        />
      )}
    </>
  )
}
