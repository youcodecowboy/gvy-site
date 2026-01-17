'use client'

import { useState, useRef, useCallback } from 'react'
import { Flag } from 'lucide-react'
import { FlagPopover } from '@/components/tiptap-ui/flag-popover/flag-popover'
import { useToast } from '@/components/ui'

interface DocFlagButtonProps {
  docId: string
  docTitle: string
}

export function DocFlagButton({ docId, docTitle }: DocFlagButtonProps) {
  const [showPopover, setShowPopover] = useState(false)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { toast } = useToast()

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopoverPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
      setShowPopover(true)
    }
  }, [])

  const handleSuccess = useCallback(() => {
    toast({
      title: 'Flag sent',
      description: 'Your flag has been sent successfully.',
    })
  }, [toast])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
        title="Flag this document for someone"
      >
        <Flag className="h-3.5 w-3.5" />
        <span>Flag</span>
      </button>
      {showPopover && popoverPosition && (
        <FlagPopover
          docId={docId}
          type="document"
          position={popoverPosition}
          onClose={() => setShowPopover(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
