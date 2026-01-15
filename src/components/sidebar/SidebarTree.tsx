'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TreeProvider, useTree } from './TreeContext'
import { TreeItem } from './TreeItem'
import { TreeEmptyState } from './TreeEmptyState'
import { MoveDialog } from './MoveDialog'
import {
  type Node,
  getRootNodes,
  getVisibleNodeIds,
  findNodeById,
  getAncestorIds,
} from '@/lib/mockTree'

interface SidebarTreeProps {
  nodes: Node[]
  onRename?: (id: string, newTitle: string) => void
  onNewDoc?: (parentId?: string | null) => void
  onNewFolder?: (parentId?: string | null) => void
  onDelete?: (id: string) => void
  onMove?: (id: string, newParentId: string | null) => void
}

function TreeContent({ nodes }: { nodes: Node[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const {
    expandedIds,
    focusedId,
    setFocusedId,
    toggleExpand,
    expand,
    collapse,
    isExpanded,
    expandAll,
    setSelectedId,
    movingId,
    cancelMove,
    onNewDoc,
    onNewFolder,
  } = useTree()

  // Extract selected ID from pathname
  useEffect(() => {
    const match = pathname.match(/\/app\/(doc|folder)\/([^/]+)/)
    if (match) {
      const id = match[2]
      setSelectedId(id)
      
      // Auto-expand ancestors when navigating
      const ancestors = getAncestorIds(nodes, id)
      if (ancestors.length > 0) {
        expandAll(ancestors)
      }
    } else {
      setSelectedId(null)
    }
  }, [pathname, nodes, setSelectedId, expandAll])

  const rootNodes = getRootNodes(nodes)
  const isEmpty = rootNodes.length === 0

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const visibleIds = getVisibleNodeIds(nodes, expandedIds)
      const currentIndex = focusedId ? visibleIds.indexOf(focusedId) : -1

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const nextIndex = currentIndex < visibleIds.length - 1 ? currentIndex + 1 : 0
          setFocusedId(visibleIds[nextIndex])
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : visibleIds.length - 1
          setFocusedId(visibleIds[prevIndex])
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (focusedId) {
            const node = findNodeById(nodes, focusedId)
            if (node?.type === 'folder' && !isExpanded(focusedId)) {
              expand(focusedId)
            }
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (focusedId) {
            const node = findNodeById(nodes, focusedId)
            if (node?.type === 'folder' && isExpanded(focusedId)) {
              collapse(focusedId)
            }
          }
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (focusedId) {
            const node = findNodeById(nodes, focusedId)
            if (node) {
              const href = node.type === 'folder'
                ? `/app/folder/${node.id}`
                : `/app/doc/${node.id}`
              router.push(href)
              if (node.type === 'folder') {
                toggleExpand(node.id)
              }
            }
          }
          break
        }
        case 'F2': {
          e.preventDefault()
          // F2 to rename is handled by TreeItem
          break
        }
      }
    },
    [nodes, expandedIds, focusedId, setFocusedId, expand, collapse, isExpanded, toggleExpand, router]
  )

  if (isEmpty) {
    return (
      <TreeEmptyState
        onNewDoc={() => onNewDoc?.(null)}
        onNewFolder={() => onNewFolder?.(null)}
      />
    )
  }

  return (
    <>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto py-2 focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="tree"
        aria-label="Document tree"
      >
        <div className="space-y-0.5 px-2">
          {rootNodes.map((node) => (
            <TreeItem key={node.id} node={node} nodes={nodes} depth={0} />
          ))}
        </div>
      </div>
      
      {/* Move dialog */}
      {movingId && (
        <MoveDialog
          nodes={nodes}
          movingNodeId={movingId}
          onClose={cancelMove}
        />
      )}
    </>
  )
}

export function SidebarTree({
  nodes,
  onRename,
  onNewDoc,
  onNewFolder,
  onDelete,
  onMove,
}: SidebarTreeProps) {
  return (
    <TreeProvider
      onRename={onRename}
      onDelete={onDelete}
      onNewDoc={onNewDoc}
      onNewFolder={onNewFolder}
      onMove={onMove}
    >
      <TreeContent nodes={nodes} />
    </TreeProvider>
  )
}
