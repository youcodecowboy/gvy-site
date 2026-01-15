'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Folder, FileText, MoreHorizontal } from 'lucide-react'
import { useTree } from './TreeContext'
import { TreeContextMenu } from './TreeContextMenu'
import type { Node } from '@/lib/mockTree'
import { hasChildren as checkHasChildren, getChildren } from '@/lib/mockTree'

interface TreeItemProps {
  node: Node
  nodes: Node[]
  depth: number
}

export function TreeItem({ node, nodes, depth }: TreeItemProps) {
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

  const href = isFolder ? `/app/folder/${node.id}` : `/app/doc/${node.id}`

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

  return (
    <div>
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
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-foreground rounded-full" />
        )}

        {/* Chevron for folders */}
        {isFolder ? (
          <button
            onClick={handleChevronClick}
            className="p-0.5 -ml-1 hover:bg-sidebar-accent rounded shrink-0"
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
            />
          ))}
        </div>
      )}
    </div>
  )
}
