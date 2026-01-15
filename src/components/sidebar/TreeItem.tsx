'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { ChevronRight, Folder, FileText, MoreHorizontal, GripVertical } from 'lucide-react'
import { useTree } from './TreeContext'
import { TreeContextMenu } from './TreeContextMenu'
import type { Node } from '@/lib/mockTree'
import { hasChildren as checkHasChildren, getChildren } from '@/lib/mockTree'

interface TreeItemProps {
  node: Node
  nodes: Node[]
  depth: number
  activeId?: string | null
  overId?: string | null
  dropPosition?: 'before' | 'after' | 'inside' | null
}

export function TreeItem({ node, nodes, depth, activeId, overId, dropPosition }: TreeItemProps) {
  const router = useRouter()
  const {
    isExpanded,
    toggleExpand,
    expand,
    renamingId,
    startRename,
    cancelRename,
    commitRename,
    selectedId,
    focusedId,
    setFocusedId,
    contextMenuId,
    contextMenuPosition,
    openContextMenu,
    closeContextMenu,
  } = useTree()

  const [localTitle, setLocalTitle] = useState(node.title)
  const [escPressed, setEscPressed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  const isFolder = node.type === 'folder'
  const expanded = isExpanded(node.id)
  const hasChildNodes = checkHasChildren(nodes, node.id)
  const isSelected = selectedId === node.id
  const isFocused = focusedId === node.id
  const isRenaming = renamingId === node.id
  const isContextMenuOpen = contextMenuId === node.id
  const isDragging = activeId === node.id

  const href = isFolder ? `/app/folder/${node.id}` : `/app/doc/${node.id}`
  
  // Draggable setup
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({
    id: node.id,
    disabled: isRenaming,
  })
  
  // Drop zone before this item
  const { setNodeRef: setDropBeforeRef, isOver: isOverBefore } = useDroppable({
    id: `before-${node.id}`,
    data: { type: 'dropzone-before', nodeId: node.id, parentId: node.parentId, order: node.order },
  })
  
  // Drop zone after this item (only if not a folder or folder is collapsed)
  const { setNodeRef: setDropAfterRef, isOver: isOverAfter } = useDroppable({
    id: `after-${node.id}`,
    data: { type: 'dropzone-after', nodeId: node.id, parentId: node.parentId, order: node.order },
    disabled: isFolder && expanded && hasChildNodes,
  })
  
  // Drop zone inside folder
  const { setNodeRef: setDropInsideRef, isOver: isOverInside } = useDroppable({
    id: `inside-${node.id}`,
    data: { type: 'folder', nodeId: node.id },
    disabled: !isFolder || isDragging,
  })

  // Auto-focus and select input when renaming starts
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
      setLocalTitle(node.title)
      setEscPressed(false)
    }
  }, [isRenaming, node.title])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isRenaming) {
        e.preventDefault()
        return
      }

      if (isFolder) {
        toggleExpand(node.id)
      }
      setFocusedId(node.id)
    },
    [isFolder, isRenaming, node.id, toggleExpand, setFocusedId]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      startRename(node.id)
    },
    [node.id, startRename]
  )

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      toggleExpand(node.id)
    },
    [node.id, toggleExpand]
  )

  const handleMoreClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      if (moreButtonRef.current) {
        const rect = moreButtonRef.current.getBoundingClientRect()
        openContextMenu(node.id, { x: rect.right, y: rect.bottom })
      }
    },
    [node.id, openContextMenu]
  )

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        if (localTitle.trim() && localTitle !== node.title) {
          commitRename(node.id, localTitle.trim())
        } else {
          cancelRename()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setEscPressed(true)
        cancelRename()
      }
    },
    [localTitle, node.id, node.title, commitRename, cancelRename]
  )

  const handleInputBlur = useCallback(() => {
    if (escPressed) {
      setEscPressed(false)
      return
    }
    if (localTitle.trim() && localTitle !== node.title) {
      commitRename(node.id, localTitle.trim())
    } else {
      cancelRename()
    }
  }, [escPressed, localTitle, node.id, node.title, commitRename, cancelRename])

  const children = isFolder && expanded ? getChildren(nodes, node.id) : []
  
  // Combine refs for folder (draggable + droppable inside)
  const combineRefs = (...refs: ((node: HTMLElement | null) => void)[]) => (node: HTMLElement | null) => {
    refs.forEach(ref => ref(node))
  }

  return (
    <div className={isDragging ? 'opacity-50' : ''}>
      {/* Drop zone before */}
      <div
        ref={setDropBeforeRef}
        className={`h-0.5 -my-0.5 mx-2 rounded transition-colors ${
          isOverBefore ? 'bg-primary' : 'bg-transparent'
        }`}
        style={{ marginLeft: `${depth * 12 + 8}px` }}
      />
      
      <div
        ref={isFolder ? combineRefs(setDragRef, setDropInsideRef) : setDragRef}
        {...attributes}
      >
        <Link
          href={href}
          onClick={handleClick}
          className={`
            group flex items-center gap-1 pr-2 py-1.5 text-sm rounded-md
            transition-colors relative select-none
            ${isSelected
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            }
            ${isFocused && !isSelected ? 'ring-1 ring-ring ring-inset' : ''}
            ${isOverInside && !isDragging ? 'ring-2 ring-primary bg-primary/10' : ''}
          `}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {/* Drag handle */}
          <button
            {...listeners}
            className="p-0.5 -ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent rounded shrink-0 cursor-grab active:cursor-grabbing touch-none"
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>

          {/* Selected indicator */}
          {isSelected && (
            <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-foreground rounded-full" />
          )}

          {/* Chevron for folders */}
          {isFolder ? (
            <button
              onClick={handleChevronClick}
              className="p-0.5 hover:bg-sidebar-accent rounded shrink-0"
              tabIndex={-1}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 ${
                  expanded ? 'rotate-90' : ''
                }`}
              />
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}

          {/* Icon */}
          {isFolder ? (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* Title or rename input */}
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-background border border-ring rounded px-1.5 py-0.5 text-sm text-foreground focus:outline-none"
            />
          ) : (
            <span
              className="flex-1 truncate"
              onDoubleClick={handleDoubleClick}
            >
              {node.title}
            </span>
          )}

          {/* More button (visible on hover) */}
          {!isRenaming && (
            <button
              ref={moreButtonRef}
              onClick={handleMoreClick}
              className={`
                p-0.5 rounded hover:bg-sidebar-accent shrink-0
                ${isContextMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                transition-opacity
              `}
              tabIndex={-1}
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </Link>
      </div>

      {/* Context menu */}
      {isContextMenuOpen && contextMenuPosition && (
        <TreeContextMenu
          node={node}
          position={contextMenuPosition}
          onClose={closeContextMenu}
        />
      )}

      {/* Children */}
      {children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              nodes={nodes}
              depth={depth + 1}
              activeId={activeId}
              overId={overId}
              dropPosition={dropPosition}
            />
          ))}
        </div>
      )}
      
      {/* Drop zone after (only shown for last item or when folder is collapsed) */}
      {(!isFolder || !expanded || !hasChildNodes) && (
        <div
          ref={setDropAfterRef}
          className={`h-0.5 -my-0.5 mx-2 rounded transition-colors ${
            isOverAfter ? 'bg-primary' : 'bg-transparent'
          }`}
          style={{ marginLeft: `${depth * 12 + 8}px` }}
        />
      )}
    </div>
  )
}

// Drag overlay component for showing the dragged item
export function DragOverlayItem({ node }: { node: Node }) {
  const isFolder = node.type === 'folder'
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-sm bg-background border border-border rounded-md shadow-lg">
      {isFolder ? (
        <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : (
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <span className="truncate">{node.title}</span>
    </div>
  )
}
