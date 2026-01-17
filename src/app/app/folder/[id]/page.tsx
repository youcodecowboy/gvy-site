'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { 
  Folder, 
  FileText, 
  Plus, 
  FolderPlus, 
  ChevronRight,
  Clock,
  Files,
  FolderOpen,
  Hash,
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { Button, Skeleton } from '@/components/ui'
import { useNavigation } from '@/components/app-shell'
import { useToast } from '@/components/ui'
import { TagsInput } from '@/components/editor'
import { IconPicker } from '@/components/editor'
import { usePrefetch } from '@/hooks/usePrefetch'

// Simple description editor (plain textarea for now, can be upgraded to TipTap later)
function DescriptionEditor({ 
  description, 
  onSave 
}: { 
  description: string
  onSave: (desc: string) => void 
}) {
  const [value, setValue] = useState(description)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    setValue(description)
  }, [description])

  const handleBlur = () => {
    setIsFocused(false)
    if (value !== description) {
      onSave(value)
    }
  }

  return (
    <div className="mb-6">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        placeholder="Add a description for this folder..."
        className={`
          w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm resize-none
          placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20
          ${isFocused ? 'border-primary' : 'border-border'}
        `}
      />
    </div>
  )
}

// Table of contents component
function TableOfContents({ 
  items, 
  currentFolderId 
}: { 
  items: any[]
  currentFolderId: string 
}) {
  if (items.length === 0) return null

  const renderItem = (item: any, depth: number = 0) => {
    const paddingLeft = depth * 16 + 8
    const isFolder = item.type === 'folder'
    const href = isFolder ? `/app/folder/${item._id}` : `/app/doc/${item._id}`

    return (
      <div key={item._id}>
        <Link
          href={href}
          className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-accent transition-colors text-sm group"
          style={{ paddingLeft }}
        >
          {item.icon ? (
            <span className="text-sm">{item.icon}</span>
          ) : isFolder ? (
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="truncate text-foreground group-hover:text-primary transition-colors">
            {item.title}
          </span>
          {isFolder && item.children?.length > 0 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />
          )}
        </Link>
        {item.children?.map((child: any) => renderItem(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-card">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Contents</h3>
      </div>
      <div className="p-2 max-h-[400px] overflow-y-auto">
        {items.map((item) => renderItem(item))}
      </div>
    </div>
  )
}

// Statistics component
function FolderStatistics({ stats }: { stats: any }) {
  if (!stats) return null

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Files className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">{stats.totalDocs}</p>
          <p className="text-xs text-muted-foreground">Documents</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <FolderOpen className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">{stats.totalFolders}</p>
          <p className="text-xs text-muted-foreground">Folders</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">{stats.estimatedWords.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Est. Words</p>
        </div>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <Clock className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-lg font-semibold">{formatDate(stats.lastUpdated)}</p>
          <p className="text-xs text-muted-foreground">Last Updated</p>
        </div>
      </div>
    </div>
  )
}

export default function FolderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  // Queries
  const folder = useQuery(api.nodes.get, { id: id as Id<'nodes'> })
  const children = useQuery(api.nodes.getChildren, { parentId: id as Id<'nodes'> })
  const stats = useQuery(api.nodes.getFolderStats, { id: id as Id<'nodes'> })
  const descendants = useQuery(api.nodes.getDescendants, { id: id as Id<'nodes'>, maxDepth: 3 })
  
  // Mutations
  const createNode = useMutation(api.nodes.create)
  const updateTitle = useMutation(api.nodes.updateTitle)
  const updateIcon = useMutation(api.nodes.updateIcon)
  const updateTags = useMutation(api.nodes.updateTags)
  const updateDescription = useMutation(api.nodes.updateDescription)
  
  // State
  const [title, setTitle] = useState('')
  const [isTitleFocused, setIsTitleFocused] = useState(false)
  
  const { setCurrentFolderId, setCurrentSection } = useNavigation()
  const { toast } = useToast()
  const { prefetchDocs } = usePrefetch()

  // Update title state when folder loads
  useEffect(() => {
    if (folder) {
      setTitle(folder.title)
    }
  }, [folder])

  // Update navigation context when folder changes
  useEffect(() => {
    if (folder) {
      setCurrentFolderId(id)
      if (folder.orgId) {
        setCurrentSection('organization')
      } else {
        setCurrentSection('personal')
      }
    }
  }, [id, folder, setCurrentFolderId, setCurrentSection])

  // Prefetch first 5 document children for faster navigation
  useEffect(() => {
    if (children && children.length > 0) {
      const docChildren = children
        .filter((child: any) => child.type === 'doc' && !child.isDeleted)
        .slice(0, 5)
        .map((child: any) => child._id)

      if (docChildren.length > 0) {
        prefetchDocs(docChildren)
      }
    }
  }, [children, prefetchDocs])

  const handleTitleBlur = async () => {
    setIsTitleFocused(false)
    if (title.trim() && title !== folder?.title) {
      try {
        await updateTitle({ id: id as Id<'nodes'>, title: title.trim() })
        toast({ title: 'Folder renamed', variant: 'success' })
      } catch (error) {
        setTitle(folder?.title || '')
        toast({ title: 'Failed to rename', variant: 'error' })
      }
    } else if (!title.trim()) {
      setTitle(folder?.title || '')
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      setTitle(folder?.title || '')
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const handleNewDoc = async () => {
    try {
      const newId = await createNode({
        type: 'doc',
        parentId: id as Id<'nodes'>,
        title: 'Untitled',
        orgId: folder?.orgId,
      })
      toast({ title: 'Document created', variant: 'success' })
      // Navigate to the new document
      router.push(`/app/doc/${newId}`)
    } catch (error) {
      toast({ title: 'Failed to create document', variant: 'error' })
    }
  }

  const handleNewFolder = async () => {
    try {
      const newId = await createNode({
        type: 'folder',
        parentId: id as Id<'nodes'>,
        title: 'New Folder',
        orgId: folder?.orgId,
      })
      toast({ title: 'Folder created', variant: 'success' })
      // Navigate to the new folder
      router.push(`/app/folder/${newId}`)
    } catch (error) {
      toast({ title: 'Failed to create folder', variant: 'error' })
    }
  }


  const handleDescriptionSave = useCallback(async (desc: string) => {
    try {
      await updateDescription({ id: id as Id<'nodes'>, description: desc })
      toast({ title: 'Description saved', variant: 'success' })
    } catch (error) {
      toast({ title: 'Failed to save description', variant: 'error' })
    }
  }, [id, updateDescription, toast])

  // Loading state
  if (folder === undefined || children === undefined) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <Skeleton className="h-10 w-[300px] mb-2" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-[100px] mb-6" />
        <Skeleton className="h-[200px]" />
      </div>
    )
  }

  // Not found state
  if (!folder || folder.type !== 'folder') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Folder className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Folder not found</h2>
          <p className="text-muted-foreground mb-6">
            This folder doesn't exist or has been deleted.
          </p>
          <Link href="/app">
            <Button variant="secondary">Go back home</Button>
          </Link>
        </div>
      </div>
    )
  }

  const sortedChildren = [...children].sort((a, b) => a.order - b.order)
  const description = typeof folder.description === 'string' ? folder.description : ''

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          {/* Icon */}
          <div className="mt-1">
            <IconPicker
              icon={folder.icon}
              onChange={async (newIcon) => {
                try {
                  await updateIcon({ id: id as Id<'nodes'>, icon: newIcon })
                } catch (error) {
                  toast({ title: 'Failed to update icon', variant: 'error' })
                }
              }}
            />
          </div>

          {/* Editable Title */}
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Folder name"
              className="w-full text-2xl font-bold bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
            
            {/* Tags */}
            <div className="mt-2">
              <TagsInput
                tagIds={folder.tagIds || []}
                onChange={(newTagIds) => updateTags({ id: id as Id<'nodes'>, tagIds: newTagIds })}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FolderPlus className="h-4 w-4" />}
            onClick={handleNewFolder}
          >
            New Folder
          </Button>
          <Button
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleNewDoc}
          >
            New Document
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <FolderStatistics stats={stats} />

      {/* Description */}
      <DescriptionEditor
        description={description}
        onSave={handleDescriptionSave}
      />

      {/* Table of Contents or Empty State */}
      {sortedChildren.length === 0 && (!descendants || descendants.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">This folder is empty</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create a new document or folder to get started.
          </p>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              size="sm"
              leftIcon={<FolderPlus className="h-4 w-4" />}
              onClick={handleNewFolder}
            >
              New Folder
            </Button>
            <Button 
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleNewDoc}
            >
              New Document
            </Button>
          </div>
        </div>
      ) : (
        <TableOfContents items={descendants || []} currentFolderId={id} />
      )}
    </div>
  )
}
