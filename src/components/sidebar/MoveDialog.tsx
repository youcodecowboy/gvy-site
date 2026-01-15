'use client'

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Folder, Home, ChevronRight, X } from 'lucide-react'
import { useTree } from './TreeContext'
import type { Node as TreeNode } from '@/lib/mockTree'

interface MoveDialogProps {
  nodes: TreeNode[]
  movingNodeId: string
  onClose: () => void
}

export function MoveDialog({ nodes, movingNodeId, onClose }: MoveDialogProps) {
  const { onMove } = useTree()
  const [mounted, setMounted] = useState(false)
  
  const movingNode = nodes.find((n) => n.id === movingNodeId)
  
  // Get all folders except the moving node and its descendants
  const getDescendantIds = (nodeId: string): string[] => {
    const descendants: string[] = []
    const queue = [nodeId]
    while (queue.length > 0) {
      const id = queue.shift()!
      descendants.push(id)
      const children = nodes.filter((n) => n.parentId === id)
      queue.push(...children.map((c) => c.id))
    }
    return descendants
  }
  
  const excludedIds = new Set(getDescendantIds(movingNodeId))
  
  const folders = nodes.filter(
    (n) => n.type === 'folder' && !excludedIds.has(n.id)
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleMove = useCallback(
    (targetId: string | null) => {
      onMove?.(movingNodeId, targetId)
      onClose()
    },
    [movingNodeId, onMove, onClose]
  )

  // Build a nested structure for display
  const buildFolderTree = () => {
    const rootFolders = folders.filter((f) => f.parentId === null)
    
    const renderFolder = (folder: TreeNode, depth: number = 0): JSX.Element => {
      const children = folders.filter((f) => f.parentId === folder.id)
      const isCurrentParent = movingNode?.parentId === folder.id
      
      return (
        <div key={folder.id}>
          <button
            onClick={() => handleMove(folder.id)}
            disabled={isCurrentParent}
            className={`
              flex w-full items-center gap-2 px-3 py-2 text-sm text-left
              hover:bg-accent transition-colors rounded-md
              ${isCurrentParent ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
          >
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{folder.title}</span>
            {isCurrentParent && (
              <span className="text-xs text-muted-foreground ml-auto">(current)</span>
            )}
          </button>
          {children.map((child) => renderFolder(child, depth + 1))}
        </div>
      )
    }

    return rootFolders.map((folder) => renderFolder(folder))
  }

  if (!mounted) return null

  const dialogContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-background border border-border rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="font-medium">Move "{movingNode?.title}"</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {/* Root option */}
          <button
            onClick={() => handleMove(null)}
            disabled={movingNode?.parentId === null}
            className={`
              flex w-full items-center gap-2 px-3 py-2 text-sm text-left
              hover:bg-accent transition-colors rounded-md
              ${movingNode?.parentId === null ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <Home className="h-4 w-4 text-muted-foreground" />
            <span>Root (no folder)</span>
            {movingNode?.parentId === null && (
              <span className="text-xs text-muted-foreground ml-auto">(current)</span>
            )}
          </button>
          
          {/* Folder tree */}
          {folders.length > 0 ? (
            buildFolderTree()
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No folders available
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(dialogContent, document.body)
}
