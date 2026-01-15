'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

const STORAGE_KEY = 'groovy-docs-expanded-folders'

interface TreeContextValue {
  // Expanded state
  expandedIds: Set<string>
  isExpanded: (id: string) => boolean
  expand: (id: string) => void
  collapse: (id: string) => void
  toggleExpand: (id: string) => void
  expandAll: (ids: string[]) => void
  collapseAll: () => void
  
  // Rename state
  renamingId: string | null
  startRename: (id: string) => void
  cancelRename: () => void
  commitRename: (id: string, newTitle: string) => void
  onRename?: (id: string, newTitle: string) => void
  
  // Delete
  onDelete?: (id: string) => void
  
  // New doc/folder
  onNewDoc?: (parentId?: string | null) => void
  onNewFolder?: (parentId?: string | null) => void
  
  // Move
  onMove?: (id: string, newParentId: string | null) => void
  movingId: string | null
  startMove: (id: string) => void
  cancelMove: () => void
  
  // Reorder (drag and drop)
  onReorder?: (id: string, newParentId: string | null, newOrder: number) => void
  
  // Selection state (from route)
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  
  // Keyboard focus
  focusedId: string | null
  setFocusedId: (id: string | null) => void
  
  // Context menu
  contextMenuId: string | null
  contextMenuPosition: { x: number; y: number } | null
  openContextMenu: (id: string, position: { x: number; y: number }) => void
  closeContextMenu: () => void
}

const TreeContext = createContext<TreeContextValue | null>(null)

interface TreeProviderProps {
  children: ReactNode
  selectedId?: string | null
  onRename?: (id: string, newTitle: string) => void
  onDelete?: (id: string) => void
  onNewDoc?: (parentId?: string | null) => void
  onNewFolder?: (parentId?: string | null) => void
  onMove?: (id: string, newParentId: string | null) => void
  onReorder?: (id: string, newParentId: string | null, newOrder: number) => void
}

export function TreeProvider({
  children,
  selectedId: initialSelectedId = null,
  onRename,
  onDelete,
  onNewDoc,
  onNewFolder,
  onMove,
  onReorder,
}: TreeProviderProps) {
  // Initialize expanded state from localStorage
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return new Set(JSON.parse(stored))
      }
    } catch {
      // Ignore errors
    }
    return new Set()
  })
  
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [contextMenuId, setContextMenuId] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Persist expanded state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...expandedIds]))
    } catch {
      // Ignore errors
    }
  }, [expandedIds])

  // Update selected ID when prop changes
  useEffect(() => {
    setSelectedId(initialSelectedId)
  }, [initialSelectedId])

  const isExpanded = useCallback(
    (id: string) => expandedIds.has(id),
    [expandedIds]
  )

  const expand = useCallback((id: string) => {
    setExpandedIds((prev) => new Set([...prev, id]))
  }, [])

  const collapse = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback((ids: string[]) => {
    setExpandedIds((prev) => new Set([...prev, ...ids]))
  }, [])

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set())
  }, [])

  const startRename = useCallback((id: string) => {
    setRenamingId(id)
    setContextMenuId(null)
    setContextMenuPosition(null)
  }, [])

  const cancelRename = useCallback(() => {
    setRenamingId(null)
  }, [])

  const commitRename = useCallback(
    (id: string, newTitle: string) => {
      onRename?.(id, newTitle)
      setRenamingId(null)
    },
    [onRename]
  )

  const startMove = useCallback((id: string) => {
    setMovingId(id)
    setContextMenuId(null)
    setContextMenuPosition(null)
  }, [])

  const cancelMove = useCallback(() => {
    setMovingId(null)
  }, [])

  const openContextMenu = useCallback(
    (id: string, position: { x: number; y: number }) => {
      setContextMenuId(id)
      setContextMenuPosition(position)
    },
    []
  )

  const closeContextMenu = useCallback(() => {
    setContextMenuId(null)
    setContextMenuPosition(null)
  }, [])

  return (
    <TreeContext.Provider
      value={{
        expandedIds,
        isExpanded,
        expand,
        collapse,
        toggleExpand,
        expandAll,
        collapseAll,
        renamingId,
        startRename,
        cancelRename,
        commitRename,
        onRename,
        onDelete,
        onNewDoc,
        onNewFolder,
        onMove,
        movingId,
        startMove,
        cancelMove,
        onReorder,
        selectedId,
        setSelectedId,
        focusedId,
        setFocusedId,
        contextMenuId,
        contextMenuPosition,
        openContextMenu,
        closeContextMenu,
      }}
    >
      {children}
    </TreeContext.Provider>
  )
}

export function useTree() {
  const context = useContext(TreeContext)
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider')
  }
  return context
}
