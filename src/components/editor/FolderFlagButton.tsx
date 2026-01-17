'use client'

import { useState, useRef, useCallback } from 'react'
import { Flag } from 'lucide-react'
import { FlagPopover } from '@/components/tiptap-ui/flag-popover/flag-popover'
import { useToast } from '@/components/ui'
import { Button } from '@/components/ui'

interface FolderFlagButtonProps {
  folderId: string
  folderTitle: string
}

export function FolderFlagButton({ folderId, folderTitle }: FolderFlagButtonProps) {
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
      title: 'Folder flagged',
      description: 'Your folder flag has been sent successfully.',
    })
  }, [toast])

  return (
    <>
      <Button
        ref={buttonRef}
        size="sm"
        variant="secondary"
        leftIcon={<Flag className="h-4 w-4" />}
        onClick={handleClick}
      >
        Flag Folder
      </Button>
      {showPopover && popoverPosition && (
        <FlagPopover
          nodeId={folderId}
          type="folder"
          position={popoverPosition}
          onClose={() => setShowPopover(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}
