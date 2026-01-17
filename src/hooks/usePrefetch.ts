'use client'

import { useCallback } from 'react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useDocCache } from '@/contexts/doc-cache-context'

/**
 * Hook for prefetching documents to improve perceived performance
 *
 * Prefetched documents are added to the cache for instant loading
 * when the user navigates to them.
 */
export function usePrefetch() {
  const { setDoc, getDoc } = useDocCache()
  const convex = useConvex()

  /**
   * Prefetch a single document by ID
   * Skips if already cached to avoid redundant network requests
   */
  const prefetchDoc = useCallback(async (id: string) => {
    // Skip if already cached
    if (getDoc(id)) {
      return
    }

    try {
      const doc = await convex.query(api.nodes.get, { id: id as Id<'nodes'> })

      if (doc && doc.type === 'doc' && !doc.isDeleted) {
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
    } catch (error) {
      // Silently ignore prefetch errors - they're not critical
      console.debug('Prefetch failed for doc:', id, error)
    }
  }, [convex, getDoc, setDoc])

  /**
   * Prefetch multiple documents in parallel
   * Useful for prefetching folder contents or recent docs
   */
  const prefetchDocs = useCallback(async (ids: string[]) => {
    // Filter out already cached docs
    const uncachedIds = ids.filter(id => !getDoc(id))

    if (uncachedIds.length === 0) {
      return
    }

    // Prefetch in parallel
    await Promise.all(uncachedIds.map(id => prefetchDoc(id)))
  }, [getDoc, prefetchDoc])

  return { prefetchDoc, prefetchDocs }
}
