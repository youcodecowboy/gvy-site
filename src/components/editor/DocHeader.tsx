'use client'

import { useState, useCallback, useEffect } from 'react'
import { Check, Loader2, Lock, Users, FileText } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { useUser, useOrganization } from '@clerk/nextjs'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { DocBreadcrumbs } from './DocBreadcrumbs'
import { TagsInput } from './TagsInput'
import { StatusDropdown } from './StatusDropdown'
import { IconPicker } from './IconPicker'

interface DocHeaderProps {
  doc: {
    _id: string
    title: string
    parentId: string | null
    icon?: string | null
    tagIds?: string[]
    status?: 'draft' | 'in_review' | 'final'
    ownerId?: string
    orgId?: string
  }
  isSaving: boolean
}

export function DocHeader({ doc, isSaving }: DocHeaderProps) {
  const { user } = useUser()
  const { organization } = useOrganization()
  const [title, setTitle] = useState(doc.title)
  const [isTitleFocused, setIsTitleFocused] = useState(false)
  const [isTogglingShare, setIsTogglingShare] = useState(false)

  const updateTitle = useMutation(api.nodes.updateTitle)
  const updateTags = useMutation(api.nodes.updateTags)
  const updateStatus = useMutation(api.nodes.updateStatus)
  const updateIcon = useMutation(api.nodes.updateIcon)
  const toggleSharing = useMutation(api.nodes.toggleSharing)
  
  // Get all nodes to build breadcrumb path
  const nodes = useQuery(api.nodes.list, {})

  // Reset title when doc changes
  useEffect(() => {
    setTitle(doc.title)
  }, [doc._id, doc.title])

  // Build breadcrumb path
  const buildPath = useCallback(() => {
    if (!nodes) return []
    
    const path: { id: string; title: string; type: 'folder' | 'doc' }[] = []
    let currentId = doc.parentId
    
    while (currentId) {
      const node = nodes.find((n) => n._id === currentId)
      if (node) {
        path.unshift({ id: node._id, title: node.title, type: node.type })
        currentId = node.parentId
      } else {
        break
      }
    }
    
    // Add current doc
    path.push({ id: doc._id, title: doc.title, type: 'doc' })
    
    return path
  }, [nodes, doc._id, doc.parentId, doc.title])

  const handleTitleBlur = async () => {
    setIsTitleFocused(false)
    if (title.trim() && title !== doc.title) {
      try {
        await updateTitle({ id: doc._id as Id<'nodes'>, title: title.trim() })
      } catch (error) {
        console.error('Failed to save title:', error)
        setTitle(doc.title)
      }
    } else if (!title.trim()) {
      setTitle(doc.title)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.target as HTMLInputElement).blur()
    }
    if (e.key === 'Escape') {
      setTitle(doc.title)
      ;(e.target as HTMLInputElement).blur()
    }
  }

  const handleTagsChange = useCallback(
    async (newTagIds: Id<'tags'>[]) => {
      try {
        await updateTags({ id: doc._id as Id<'nodes'>, tagIds: newTagIds })
        // After updating, the old tags field will be automatically removed by the migration
      } catch (error) {
        console.error('Failed to save tags:', error)
      }
    },
    [doc._id, updateTags]
  )

  const handleStatusChange = useCallback(
    async (newStatus: 'draft' | 'in_review' | 'final') => {
      try {
        await updateStatus({ id: doc._id as Id<'nodes'>, status: newStatus })
      } catch (error) {
        console.error('Failed to save status:', error)
      }
    },
    [doc._id, updateStatus]
  )

  const handleToggleShare = useCallback(async () => {
    if (isTogglingShare) return
    
    setIsTogglingShare(true)
    try {
      await toggleSharing({
        id: doc._id as Id<'nodes'>,
        orgId: organization?.id,
      })
    } catch (error) {
      console.error('Failed to toggle sharing:', error)
    } finally {
      setIsTogglingShare(false)
    }
  }, [doc._id, organization?.id, toggleSharing, isTogglingShare])

  const breadcrumbPath = buildPath()
  const isPrivate = !doc.orgId

  return (
    <div className="mb-8">
      {/* Breadcrumbs */}
      <DocBreadcrumbs path={breadcrumbPath} />

      {/* Title row */}
      <div className="flex items-start gap-3 mb-4">
        {/* Icon */}
        <div className="mt-1">
          <IconPicker
            icon={doc.icon}
            onChange={async (newIcon) => {
              try {
                await updateIcon({ id: doc._id as Id<'nodes'>, icon: newIcon })
              } catch (error) {
                console.error('Failed to update icon:', error)
              }
            }}
          />
        </div>

        {/* Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="Untitled"
          className="flex-1 text-3xl font-bold bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
        />

        {/* Right side: save indicator + privacy */}
        <div className="flex items-center gap-2 mt-2">
          {/* Save indicator */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                <span>Saved</span>
              </>
            )}
          </div>

          {/* Privacy toggle */}
          <button
            onClick={handleToggleShare}
            disabled={isTogglingShare || !organization}
            className={`
              flex items-center gap-1 px-2 py-0.5 text-xs rounded transition-colors
              ${isPrivate 
                ? 'bg-muted hover:bg-muted/80' 
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50'
              }
              ${!organization ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isTogglingShare ? 'opacity-50' : ''}
            `}
            title={
              !organization 
                ? 'Join an organization to share documents' 
                : isPrivate 
                  ? 'Click to share with organization' 
                  : 'Click to make private'
            }
          >
            {isTogglingShare ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : isPrivate ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Users className="h-3 w-3" />
            )}
            <span>{isPrivate ? 'Private' : 'Shared'}</span>
          </button>
        </div>
      </div>

      {/* Properties row */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <TagsInput
          tagIds={(doc.tagIds || []) as Id<'tags'>[]}
          onChange={handleTagsChange}
        />
        
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Status:</span>
          <StatusDropdown
            status={doc.status || 'draft'}
            onChange={handleStatusChange}
          />
        </div>

        {user && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Owner:</span>
            <span className="text-xs">@{user.username || user.firstName || 'you'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
