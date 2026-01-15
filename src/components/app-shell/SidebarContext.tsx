'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'

interface SidebarContextValue {
  // Mobile menu state
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
  // Desktop collapse state
  isCollapsed: boolean
  collapse: () => void
  expand: () => void
  toggleCollapse: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const COLLAPSED_KEY = 'sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY)
    if (stored === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed))
  }, [isCollapsed])

  // Mobile menu controls
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  // Desktop collapse controls
  const collapse = useCallback(() => setIsCollapsed(true), [])
  const expand = useCallback(() => setIsCollapsed(false), [])
  const toggleCollapse = useCallback(() => setIsCollapsed((prev) => !prev), [])

  return (
    <SidebarContext.Provider value={{ 
      isOpen, 
      open, 
      close, 
      toggle,
      isCollapsed,
      collapse,
      expand,
      toggleCollapse,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
