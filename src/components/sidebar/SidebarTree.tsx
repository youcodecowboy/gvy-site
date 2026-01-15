'use client'

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
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
import { ChevronLeft, Home, ChevronRight, Folder } from 'lucide-react'
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
  getNodePath,
  getDescendants,
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

// Focus mode breadcrumb component
function FocusBreadcrumb({ nodes, focusedFolderId, onNavigate }: {
  nodes: Node[]
  focusedFolderId: string
  onNavigate: (folderId: string | null) => void
}) {
  const focusPath = getNodePath(nodes, focusedFolderId)
  const focusedFolder = findNodeById(nodes, focusedFolderId)
  
  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-sidebar-accent/50 border-b border-sidebar-border text-xs">
      <button
        onClick={() => onNavigate(null)}
        className="p-1 rounded hover:bg-sidebar-accent transition-colors shrink-0"
        title="Back to all folders"
      >
        <Home className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      
      {focusPath.length > 1 && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <button
            onClick={() => onNavigate(focusPath[focusPath.length - 2]?.id || null)}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors shrink-0"
            title="Go up one level"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </>
      )}
      
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate font-medium text-foreground">
          {focusedFolder?.title || 'Folder'}
        </span>
      </div>
    </div>
  )
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
    focusedFolderId,
    goUpFocusLevel,
  } = useTree()
  
  // Filter nodes when in focus mode
  const displayNodes = useMemo(() => {
    if (!focusedFolderId) return nodes
    
    // Get the focused folder and all its descendants
    const focusedFolder = findNodeById(nodes, focusedFolderId)
    if (!focusedFolder) return nodes
    
    const descendants = getDescendants(nodes, focusedFolderId)
    return [focusedFolder, ...descendants]
  }, [nodes, focusedFolderId])
  
  // Get root nodes for display (direct children of focused folder, or actual root)
  const displayRootNodes = useMemo(() => {
    if (focusedFolderId) {
      return getChildren(displayNodes, focusedFolderId)
    }
    return getRootNodes(displayNodes)
  }, [displayNodes, focusedFolderId])
  
  // DnD sensors with activation delay to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )
  
  const activeNode = activeId ? findNodeById(displayNodes, activeId) : null
  
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

  const isEmpty = displayRootNodes.length === 0 && !focusedFolderId

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const visibleIds = getVisibleNodeIds(displayNodes, expandedIds, focusedFolderId)
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
            const node = findNodeById(displayNodes, focusedId)
            if (node?.type === 'folder' && !isExpanded(focusedId)) {
              expand(focusedId)
            }
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (focusedId) {
            const node = findNodeById(displayNodes, focusedId)
            if (node?.type === 'folder' && isExpanded(focusedId)) {
              collapse(focusedId)
            }
          }
          break
        }
        case 'Enter': {
          e.preventDefault()
          if (focusedId) {
            const node = findNodeById(displayNodes, focusedId)
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
        case 'Escape': {
          // Exit focus mode with Escape
          if (focusedFolderId) {
            e.preventDefault()
            goUpFocusLevel(null)
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
    [displayNodes, expandedIds, focusedId, focusedFolderId, setFocusedId, expand, collapse, isExpanded, toggleExpand, router, goUpFocusLevel]
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
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Focus mode breadcrumb */}
        {focusedFolderId && (
          <FocusBreadcrumb
            nodes={nodes}
            focusedFolderId={focusedFolderId}
            onNavigate={goUpFocusLevel}
          />
        )}
        
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto py-2 focus:outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="tree"
          aria-label="Document tree"
        >
          {displayRootNodes.length === 0 && focusedFolderId ? (
            <div className="px-4 py-3 text-xs text-muted-foreground text-center">
              This folder is empty
            </div>
          ) : (
            <div className="space-y-0.5 px-2">
              {displayRootNodes.map((node) => (
                <TreeItem 
                  key={node.id} 
                  node={node} 
                  nodes={displayNodes} 
                  depth={0}
                  activeId={activeId}
                  overId={overId}
                  dropPosition={dropPosition}
                />
              ))}
            </div>
          )}
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
