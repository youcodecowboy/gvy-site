'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { EmptyState, Button, Skeleton, useToast } from '@/components/ui'
import { TipTapEditor, DocHeader } from '@/components/editor'
import { useDocCache } from '@/contexts/doc-cache-context'

export default function DocPage() {
  const params = useParams()
  const id = params.id as string
  const doc = useQuery(api.nodes.get, { id: id as Id<'nodes'> })
  const [isSaving, setIsSaving] = useState(false)
  const { toast, loading } = useToast()
  const { getDoc, setDoc } = useDocCache()
  const hasShownLoadingRef = useRef(false)
  const prevIdRef = useRef<string | null>(null)

  // Get cached doc if available
  const cachedDoc = getDoc(id)

  // Show loading toast when switching documents
  useEffect(() => {
    if (id !== prevIdRef.current) {
      prevIdRef.current = id
      hasShownLoadingRef.current = false
    }

    // Show loading toast if doc is loading and we don't have a cache
    if (doc === undefined && !cachedDoc && !hasShownLoadingRef.current) {
      hasShownLoadingRef.current = true
      loading({
        title: 'Loading document',
        description: 'Fetching content...',
        duration: 1500,
      })
    }
  }, [id, doc, cachedDoc, loading])

  // Cache the doc when it loads
  useEffect(() => {
    if (doc && doc.type === 'doc') {
      setDoc({
        _id: doc._id as string,
        title: doc.title,
        content: doc.content || '',
        icon: doc.icon ?? null,
        parentId: (doc.parentId as string) ?? null,
        tagIds: doc.tagIds,
        status: doc.status ?? null,
        ownerId: doc.ownerId ?? '',
        orgId: doc.orgId ?? null,
        type: 'doc',
        cachedAt: Date.now(),
      })
    }
  }, [doc, setDoc])

  // Use cached doc while loading, or show skeleton if no cache
  const displayDoc = doc ?? cachedDoc

  // Loading state - only show if no cached version
  if (displayDoc === undefined) {
    return (
      <div className="min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb skeleton */}
          <Skeleton className="h-4 w-48 mb-4" />
          
          {/* Title skeleton */}
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-10 w-96" />
          </div>
          
          {/* Properties skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          
          {/* Editor skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (doc === null || (doc && doc.type !== 'doc')) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Document not found"
          description="This document doesn't exist or has been deleted."
          actions={
            <Link href="/app">
              <Button variant="secondary">Go back home</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DocHeader
          doc={{
            _id: displayDoc._id as string,
            title: displayDoc.title,
            parentId: displayDoc.parentId as string | null ?? null,
            icon: displayDoc.icon ?? null,
            tagIds: displayDoc.tagIds,
            status: displayDoc.status as 'draft' | 'in_review' | 'final' | undefined,
            ownerId: displayDoc.ownerId ?? '',
            orgId: displayDoc.orgId ?? undefined,
          }}
          isSaving={isSaving}
        />
        <TipTapEditor
          docId={displayDoc._id as string}
          docTitle={displayDoc.title}
          content={displayDoc.content ?? ''}
          onSavingChange={setIsSaving}
        />
      </div>
    </div>
  )
}
