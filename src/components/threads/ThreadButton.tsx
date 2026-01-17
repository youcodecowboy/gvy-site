'use client'

import { useState, useEffect } from 'react'
import { type Editor } from '@tiptap/react'
import { MessageSquarePlus } from 'lucide-react'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { CreateThreadDialog } from './CreateThreadDialog'

interface ThreadButtonProps {
  editor: Editor | null
  docId?: string
  orgId?: string
}

export function ThreadButton({ editor, docId, orgId }: ThreadButtonProps) {
  const [canCreateThread, setCanCreateThread] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [dialogPosition, setDialogPosition] = useState<{ top: number; left: number } | null>(null)
  const [selectionData, setSelectionData] = useState<{
    from: number
    to: number
    selectedText: string
  } | null>(null)

  useEffect(() => {
    if (!editor) return

    const updateCanCreate = () => {
      const { from, to } = editor.state.selection
      // Can create thread if there's a text selection
      setCanCreateThread(from !== to && editor.isEditable)
    }

    updateCanCreate()
    editor.on('selectionUpdate', updateCanCreate)

    return () => {
      editor.off('selectionUpdate', updateCanCreate)
    }
  }, [editor])

  if (!canCreateThread || !editor || !docId) {
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
      setDialogPosition({
        top: Math.max(start.bottom, end.bottom) + 8,
        left: Math.min(start.left, end.left),
      })
      setShowDialog(true)
    } catch (e) {
      // Fallback to selection API
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setDialogPosition({
          top: rect.bottom + 8,
          left: rect.left,
        })
        setShowDialog(true)
      }
    }
  }

  return (
    <>
      <Button
        type="button"
        data-style="ghost"
        onClick={handleClick}
        tooltip="Add to Thread"
      >
        <MessageSquarePlus className="tiptap-button-icon h-4 w-4" />
      </Button>
      {showDialog && dialogPosition && selectionData && (
        <CreateThreadDialog
          docId={docId}
          orgId={orgId}
          selectionData={selectionData}
          position={dialogPosition}
          onClose={() => {
            setShowDialog(false)
            setSelectionData(null)
          }}
        />
      )}
    </>
  )
}
