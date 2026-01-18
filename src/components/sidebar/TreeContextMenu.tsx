'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Trash2, FileText, FolderPlus, MoveRight, Upload } from 'lucide-react'
import { useOrganization } from '@clerk/nextjs'
import { useTree } from './TreeContext'
import { useNavigation } from '@/components/app-shell'
import { DocumentUploadButton } from '@/components/upload'
import type { Node as TreeNode } from '@/lib/mockTree'
import type { Id } from '../../../convex/_generated/dataModel'

interface TreeContextMenuProps {
  node: TreeNode
  position: { x: number; y: number }
  onClose: () => void
}

export function TreeContextMenu({ node, position, onClose }: TreeContextMenuProps) {
  const { startRename, onDelete, onNewDoc, onNewFolder, startMove } = useTree()
  const { organization } = useOrganization()
  const { currentSection } = useNavigation()
  const menuRef = useRef<HTMLDivElement>(null)

  const isFolder = node.type === 'folder'
  const isOrgSection = currentSection === 'organization' && organization?.id

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as globalThis.Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Delay adding listener to avoid immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = position.x
      let adjustedY = position.y

      if (position.x + rect.width > viewportWidth) {
        adjustedX = position.x - rect.width
      }

      if (position.y + rect.height > viewportHeight) {
        adjustedY = position.y - rect.height
      }

      menuRef.current.style.left = `${adjustedX}px`
      menuRef.current.style.top = `${adjustedY}px`
    }
  }, [position])

  const handleRename = useCallback(() => {
    startRename(node.id)
    onClose()
  }, [node.id, startRename, onClose])

  const handleDelete = useCallback(() => {
    onDelete?.(node.id)
    onClose()
  }, [node.id, onDelete, onClose])

  const handleNewDoc = useCallback(() => {
    onNewDoc?.(node.id)
    onClose()
  }, [node.id, onNewDoc, onClose])

  const handleNewFolder = useCallback(() => {
    onNewFolder?.(node.id)
    onClose()
  }, [node.id, onNewFolder, onClose])

  const handleMove = useCallback(() => {
    startMove(node.id)
    onClose()
  }, [node.id, startMove, onClose])

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] rounded-md border border-border bg-background shadow-md py-1"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={handleRename}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <Pencil className="h-4 w-4 text-muted-foreground" />
        Rename
      </button>

      <button
        onClick={handleMove}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
      >
        <MoveRight className="h-4 w-4 text-muted-foreground" />
        Move to...
      </button>

      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-accent transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>

      {isFolder && (
        <>
          <div className="my-1 h-px bg-border" />
          
          <button
            onClick={handleNewDoc}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <FileText className="h-4 w-4 text-muted-foreground" />
            New Doc
          </button>

          <button
            onClick={handleNewFolder}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
            New Folder
          </button>

          <DocumentUploadButton
            folderId={node.id as Id<'nodes'>}
            orgId={isOrgSection ? organization?.id : undefined}
            variant="menu-item"
            onComplete={onClose}
          />
        </>
      )}
    </div>
  )

  // Render in portal
  if (typeof document === 'undefined') return null
  return createPortal(menuContent, document.body)
}
