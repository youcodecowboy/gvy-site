'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

interface CachedDoc {
  _id: string
  title: string
  content: string
  icon?: string | null
  parentId?: string | null
  tagIds?: string[]
  status?: string | null
  ownerId?: string
  orgId?: string | null
  type: 'doc'
  cachedAt: number
  isOptimistic?: boolean // Flag for optimistically created documents
}

interface DocCacheContextValue {
  getDoc: (id: string) => CachedDoc | undefined
  setDoc: (doc: CachedDoc) => void
  invalidateDoc: (id: string) => void
  clearCache: () => void
}

const DocCacheContext = createContext<DocCacheContextValue | null>(null)

// Cache docs for 10 minutes (extended for prefetched docs)
const CACHE_TTL = 10 * 60 * 1000
// Max cache size increased from 20 to 30 for better prefetch performance
const MAX_CACHE_SIZE = 30

export function DocCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, CachedDoc>>(new Map())

  const getDoc = useCallback((id: string): CachedDoc | undefined => {
    const doc = cache.get(id)
    if (!doc) return undefined
    
    // Check if cache is still valid
    if (Date.now() - doc.cachedAt > CACHE_TTL) {
      // Cache expired, remove it
      setCache((prev) => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
      return undefined
    }
    
    return doc
  }, [cache])

  const setDoc = useCallback((doc: CachedDoc) => {
    setCache((prev) => {
      const next = new Map(prev)
      next.set(doc._id, { ...doc, cachedAt: Date.now() })
      
      // Keep cache size reasonable (max 30 docs)
      if (next.size > MAX_CACHE_SIZE) {
        // Remove oldest entry (LRU eviction)
        const entries = Array.from(next.entries())
        entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt)
        next.delete(entries[0][0])
      }
      
      return next
    })
  }, [])

  const invalidateDoc = useCallback((id: string) => {
    setCache((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const clearCache = useCallback(() => {
    setCache(new Map())
  }, [])

  return (
    <DocCacheContext.Provider value={{ getDoc, setDoc, invalidateDoc, clearCache }}>
      {children}
    </DocCacheContext.Provider>
  )
}

export function useDocCache() {
  const context = useContext(DocCacheContext)
  if (!context) {
    throw new Error('useDocCache must be used within a DocCacheProvider')
  }
  return context
}
