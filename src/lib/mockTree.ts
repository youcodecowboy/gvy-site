// Flat node type for the tree
export type Node = {
  id: string
  type: 'folder' | 'doc'
  parentId: string | null
  title: string
  icon?: string | null
  order: number
  updatedAt?: string
}

// Mock data in flat format
export const mockNodes: Node[] = [
  // Root level
  { id: 'folder-1', type: 'folder', parentId: null, title: 'Getting Started', order: 0 },
  { id: 'folder-2', type: 'folder', parentId: null, title: 'Projects', order: 1 },
  { id: 'doc-6', type: 'doc', parentId: null, title: 'Meeting Notes', order: 2, updatedAt: '2024-01-14T08:00:00Z' },
  { id: 'doc-7', type: 'doc', parentId: null, title: 'Ideas & Brainstorming', order: 3, updatedAt: '2024-01-09T13:30:00Z' },
  
  // Inside "Getting Started"
  { id: 'doc-1', type: 'doc', parentId: 'folder-1', title: 'Welcome to Groovy Docs', order: 0, updatedAt: '2024-01-14T10:30:00Z' },
  { id: 'doc-2', type: 'doc', parentId: 'folder-1', title: 'Quick Start Guide', order: 1, updatedAt: '2024-01-13T14:20:00Z' },
  
  // Inside "Projects"
  { id: 'folder-3', type: 'folder', parentId: 'folder-2', title: 'Web App', order: 0 },
  { id: 'doc-5', type: 'doc', parentId: 'folder-2', title: 'Project Roadmap', order: 1, updatedAt: '2024-01-10T11:00:00Z' },
  
  // Inside "Web App"
  { id: 'doc-3', type: 'doc', parentId: 'folder-3', title: 'Architecture Overview', order: 0, updatedAt: '2024-01-12T09:15:00Z' },
  { id: 'doc-4', type: 'doc', parentId: 'folder-3', title: 'API Documentation', order: 1, updatedAt: '2024-01-11T16:45:00Z' },
]

// Legacy nested tree type (for compatibility)
export type TreeNode = {
  id: string
  name: string
  type: 'folder' | 'doc'
  children?: TreeNode[]
  updatedAt?: string
}

// Get children of a node
export function getChildren(nodes: Node[], parentId: string | null): Node[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

// Get root nodes
export function getRootNodes(nodes: Node[]): Node[] {
  return getChildren(nodes, null)
}

// Check if a node has children
export function hasChildren(nodes: Node[], nodeId: string): boolean {
  return nodes.some((node) => node.parentId === nodeId)
}

// Find a node by ID
export function findNodeById(nodes: Node[], id: string): Node | null {
  return nodes.find((node) => node.id === id) || null
}

// Get all ancestor IDs of a node (for breadcrumbs)
export function getAncestorIds(nodes: Node[], nodeId: string): string[] {
  const ancestors: string[] = []
  let current = findNodeById(nodes, nodeId)
  
  while (current?.parentId) {
    ancestors.unshift(current.parentId)
    current = findNodeById(nodes, current.parentId)
  }
  
  return ancestors
}

// Get path to a node (for breadcrumbs)
export function getNodePath(nodes: Node[], nodeId: string): Node[] {
  const path: Node[] = []
  let current = findNodeById(nodes, nodeId)
  
  while (current) {
    path.unshift(current)
    current = current.parentId ? findNodeById(nodes, current.parentId) : null
  }
  
  return path
}

// Get all visible node IDs (for keyboard navigation)
export function getVisibleNodeIds(
  nodes: Node[],
  expandedIds: Set<string>,
  parentId: string | null = null
): string[] {
  const result: string[] = []
  const children = getChildren(nodes, parentId)
  
  for (const child of children) {
    result.push(child.id)
    if (child.type === 'folder' && expandedIds.has(child.id)) {
      result.push(...getVisibleNodeIds(nodes, expandedIds, child.id))
    }
  }
  
  return result
}

// Get all descendants of a node (for focus mode)
export function getDescendants(nodes: Node[], parentId: string): Node[] {
  const result: Node[] = []
  const children = getChildren(nodes, parentId)
  
  for (const child of children) {
    result.push(child)
    if (child.type === 'folder') {
      result.push(...getDescendants(nodes, child.id))
    }
  }
  
  return result
}

// Get recently updated docs
export function getRecentDocs(nodes: Node[], limit = 5): Node[] {
  return nodes
    .filter((node) => node.type === 'doc' && node.updatedAt)
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return dateB - dateA
    })
    .slice(0, limit)
}

// Get depth of a node
export function getNodeDepth(nodes: Node[], nodeId: string): number {
  let depth = 0
  let current = findNodeById(nodes, nodeId)
  
  while (current?.parentId) {
    depth++
    current = findNodeById(nodes, current.parentId)
  }
  
  return depth
}

// Convert flat nodes to nested tree (for legacy compatibility)
export function toNestedTree(nodes: Node[], parentId: string | null = null): TreeNode[] {
  return getChildren(nodes, parentId).map((node) => ({
    id: node.id,
    name: node.title,
    type: node.type,
    updatedAt: node.updatedAt,
    children: node.type === 'folder' ? toNestedTree(nodes, node.id) : undefined,
  }))
}

// Legacy export for compatibility
export const mockTree = toNestedTree(mockNodes)
