'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { EmptyState, Button, Skeleton, useToast } from '@/components/ui'
import { TipTapEditor, DocHeader } from '@/components/editor'
import { useDocCache } from '@/contexts/doc-cache-context'
import { TocProvider } from '@/components/tiptap-node/toc-node/context/toc-context'
import { useTokenCache } from '@/contexts/token-cache-context'

export default function DocPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const doc = useQuery(api.nodes.get, { id: id as Id<'nodes'> })
  const [isSaving, setIsSaving] = useState(false)
  const [showThreads, setShowThreads] = useState(false)
  const { toast, loading } = useToast()
  const { getDoc, setDoc } = useDocCache()
  const hasShownLoadingRef = useRef(false)
  const prevIdRef = useRef<string | null>(null)
  const hasHandledFlagRef = useRef(false)

  // Use globally cached tokens (fetched once on app load, refreshed every 50min)
  const { aiToken, collabToken } = useTokenCache()

  // Thread count for the header button
  const threadCount = useQuery(api.threads.getThreadCount, { docId: id as Id<'nodes'> })

  // Flag query params
  const flagId = searchParams.get('flag')
  const flagFrom = searchParams.get('from')
  const flagTo = searchParams.get('to')

  // Get cached doc if available
  const cachedDoc = getDoc(id)

  // Mark flag as read when navigating from a flag link
  const markFlagRead = useMutation(api.flags.markFlagRead)
  const flag = useQuery(
    api.flags.getFlag,
    flagId ? { flagId: flagId as Id<'flags'> } : 'skip'
  )

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
        currentVersionString: doc.currentVersionString ?? 'v1.0',
        type: 'doc',
        cachedAt: Date.now(),
      })
    }
  }, [doc, setDoc])

  // Log document view
  const logView = useMutation(api.views.logView)
  useEffect(() => {
    if (doc && doc.type === 'doc' && !doc.isDeleted) {
      logView({ docId: doc._id as Id<'nodes'> }).catch(() => {
        // Silently ignore errors - view logging is non-critical
      })
    }
  }, [doc?._id, doc?.type, doc?.isDeleted, logView])

  // Handle flag navigation - mark as read and show toast
  useEffect(() => {
    if (flagId && flag && !hasHandledFlagRef.current) {
      hasHandledFlagRef.current = true

      // Mark flag as read if not already
      if (!flag.isRead) {
        markFlagRead({ flagId: flagId as Id<'flags'> }).catch(() => {
          // Silently ignore errors
        })
      }

      // Show toast about the flag
      toast({
        title: `Flag from ${flag.senderName}`,
        description: flag.message.length > 100
          ? flag.message.slice(0, 100) + '...'
          : flag.message,
        duration: 5000,
      })
    }
  }, [flagId, flag, markFlagRead, toast])

  // Reset flag handling when document changes
  useEffect(() => {
    if (id !== prevIdRef.current) {
      hasHandledFlagRef.current = false
    }
  }, [id])

  // Use cached doc while loading, or show skeleton if no cache
  const displayDoc = doc ?? cachedDoc

  // Toggle threads panel
  const handleToggleThreads = useCallback(() => {
    setShowThreads((prev) => !prev)
  }, [])

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
    <TocProvider>
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
              currentVersionString: displayDoc.currentVersionString ?? 'v1.0',
            }}
            isSaving={isSaving}
            showThreads={showThreads}
            onToggleThreads={handleToggleThreads}
            threadCount={threadCount?.open ?? 0}
          />
          <TipTapEditor
            docId={displayDoc._id as string}
            docTitle={displayDoc.title}
            content={displayDoc.content ?? ''}
            versionString={displayDoc.currentVersionString ?? 'v1.0'}
            onSavingChange={setIsSaving}
            scrollToPosition={flagFrom && flagTo ? { from: parseInt(flagFrom), to: parseInt(flagTo) } : undefined}
            aiToken={aiToken}
            collabToken={collabToken}
            showThreads={showThreads}
            onToggleThreads={handleToggleThreads}
            threadCount={threadCount?.open ?? 0}
          />
        </div>
      </div>
    </TocProvider>
  )
}
