'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

export type NavigationSection = 'personal' | 'organization'

interface NavigationContextValue {
  // Current section being viewed
  currentSection: NavigationSection
  setCurrentSection: (section: NavigationSection) => void
  // Current folder ID (null = root level)
  currentFolderId: string | null
  setCurrentFolderId: (id: string | null) => void
  // Convenience function to set both
  navigateTo: (section: NavigationSection, folderId: string | null) => void
}

const NavigationContext = createContext<NavigationContextValue | null>(null)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentSection, setCurrentSection] = useState<NavigationSection>('personal')
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  const navigateTo = useCallback((section: NavigationSection, folderId: string | null) => {
    setCurrentSection(section)
    setCurrentFolderId(folderId)
  }, [])

  return (
    <NavigationContext.Provider value={{
      currentSection,
      setCurrentSection,
      currentFolderId,
      setCurrentFolderId,
      navigateTo,
    }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
