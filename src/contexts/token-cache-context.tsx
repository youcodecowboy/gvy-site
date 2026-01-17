'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { fetchAiToken, fetchCollabToken } from '@/lib/tiptap-collab-utils'

interface TokenCacheContextValue {
  aiToken: string | null
  collabToken: string | null
  isLoading: boolean
  refreshTokens: () => Promise<void>
}

const TokenCacheContext = createContext<TokenCacheContextValue | null>(null)

// Refresh tokens every 50 minutes (assuming 60min expiry)
const TOKEN_REFRESH_INTERVAL = 50 * 60 * 1000

/**
 * Global token cache provider for TipTap AI and Collaboration tokens
 *
 * Fetches tokens once on mount and refreshes them automatically every 50 minutes.
 * This eliminates the need to fetch tokens on every document load, improving
 * perceived performance significantly.
 */
export function TokenCacheProvider({ children }: { children: ReactNode }) {
  const [aiToken, setAiToken] = useState<string | null>(null)
  const [collabToken, setCollabToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshTokens = async () => {
    try {
      const [ai, collab] = await Promise.all([
        fetchAiToken(),
        fetchCollabToken(),
      ])
      setAiToken(ai)
      setCollabToken(collab)
    } catch (error) {
      console.error('Failed to fetch tokens:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch tokens on mount
  useEffect(() => {
    refreshTokens()
  }, [])

  // Auto-refresh tokens every 50 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Refreshing TipTap tokens...')
      refreshTokens()
    }, TOKEN_REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  return (
    <TokenCacheContext.Provider
      value={{
        aiToken,
        collabToken,
        isLoading,
        refreshTokens,
      }}
    >
      {children}
    </TokenCacheContext.Provider>
  )
}

export function useTokenCache() {
  const context = useContext(TokenCacheContext)
  if (!context) {
    throw new Error('useTokenCache must be used within a TokenCacheProvider')
  }
  return context
}
