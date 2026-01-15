'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { TreeProvider, useTree } from './TreeContext'
import { TreeItem, DragOverlayItem } from './TreeItem'
import { TreeEmptyState } from './TreeEmptyState'
import { MoveDialog } from './MoveDialog'
import {
  type Node,
  getRootNodes,
  getVisibleNodeIds,
  findNodeById,
  getAncestorIds,
  getChildren,
} from '@/lib/mockTree'

interface SidebarTreeProps {
  nodes: Node[]
  onRename?: (id: string, newTitle: string) => void
  onNewDoc?: (parentId?: string | null) => void
  onNewFolder?: (parentId?: string | null) => void
  onDelete?: (id: string) => void
  onMove?: (id: string, newParentId: string | null) => void
  onReorder?: (id: string, newParentId: string | null, newOrder: number) => void
}

function TreeContent({ nodes }: { nodes: Node[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null)
  
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
    onReorder,
  } = useTree()
  
  // DnD sensors with activation delay to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )
  
  const activeNode = activeId ? findNodeById(nodes, activeId) : null
  
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])
  
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverId(null)
      setDropPosition(null)
      return
    }
    
    const overId = over.id as string
    const overData = over.data.current as { type?: string; parentId?: string | null; order?: number } | undefined
    
    setOverId(overId)
    
    // Determine drop position based on where in the item we're hovering
    if (overData?.type === 'dropzone-before') {
      setDropPosition('before')
    } else if (overData?.type === 'dropzone-after') {
      setDropPosition('after')
    } else if (overData?.type === 'folder') {
      setDropPosition('inside')
    } else {
      setDropPosition('after')
    }
  }, [])
  
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveId(null)
    setOverId(null)
    setDropPosition(null)
    
    if (!over || active.id === over.id) {
      return
    }
    
    const draggedId = active.id as string
    const draggedNode = findNodeById(nodes, draggedId)
    if (!draggedNode) return
    
    const overData = over.data.current as { 
      type?: string
      nodeId?: string
      parentId?: string | null
      order?: number 
    } | undefined
    
    if (!overData) return
    
    let newParentId: string | null = null
    let newOrder = 0
    
    if (overData.type === 'dropzone-before') {
      // Dropping before another item
      const targetNode = findNodeById(nodes, overData.nodeId!)
      if (targetNode) {
        newParentId = targetNode.parentId
        newOrder = targetNode.order
      }
    } else if (overData.type === 'dropzone-after') {
      // Dropping after another item
      const targetNode = findNodeById(nodes, overData.nodeId!)
      if (targetNode) {
        newParentId = targetNode.parentId
        newOrder = targetNode.order + 1
      }
    } else if (overData.type === 'folder') {
      // Dropping inside a folder
      newParentId = overData.nodeId!
      // Get children count to put at end
      const children = getChildren(nodes, overData.nodeId!)
      newOrder = children.length
      // Auto-expand the folder
      expand(overData.nodeId!)
    } else {
      return
    }
    
    // Don't allow dropping a folder into itself or its descendants
    if (draggedNode.type === 'folder' && newParentId) {
      const ancestors = getAncestorIds(nodes, newParentId)
      if (ancestors.includes(draggedId) || newParentId === draggedId) {
        return
      }
    }
    
    onReorder?.(draggedId, newParentId, newOrder)
  }, [nodes, onReorder, expand])
  
  const handleDragCancel = useCallback(() => {
    setActiveId(null)
    setOverId(null)
    setDropPosition(null)
  }, [])

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
            <TreeItem 
              key={node.id} 
              node={node} 
              nodes={nodes} 
              depth={0}
              activeId={activeId}
              overId={overId}
              dropPosition={dropPosition}
            />
          ))}
        </div>
      </div>
      
      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeNode && (
          <DragOverlayItem node={activeNode} />
        )}
      </DragOverlay>
      
      {/* Move dialog */}
      {movingId && (
        <MoveDialog
          nodes={nodes}
          movingNodeId={movingId}
          onClose={cancelMove}
        />
      )}
    </DndContext>
  )
}

export function SidebarTree({
  nodes,
  onRename,
  onNewDoc,
  onNewFolder,
  onDelete,
  onMove,
  onReorder,
}: SidebarTreeProps) {
  return (
    <TreeProvider
      onRename={onRename}
      onDelete={onDelete}
      onNewDoc={onNewDoc}
      onNewFolder={onNewFolder}
      onMove={onMove}
      onReorder={onReorder}
    >
      <TreeContent nodes={nodes} />
    </TreeProvider>
  )
}
