'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'next-themes'
import { useQuery } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import {
  FileText,
  FolderPlus,
  Folder,
  Search,
  Moon,
  Sun,
  Command,
} from 'lucide-react'

interface CommandAction {
  id: string
  label: string
  icon: ReactNode
  shortcut?: string
  onSelect: () => void
}

interface CommandPaletteContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null)

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}

interface CommandPaletteProviderProps {
  children: ReactNode
  onNewDoc?: () => void
  onNewFolder?: () => void
}

export function CommandPaletteProvider({
  children,
  onNewDoc,
  onNewFolder,
}: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  
  // Fetch all documents for search
  const allNodes = useQuery(api.nodes.list, {})

  useEffect(() => {
    setMounted(true)
  }, [])

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  const isDark = resolvedTheme === 'dark'

  // Base actions (always available)
  const baseActions: CommandAction[] = useMemo(() => [
    {
      id: 'new-doc',
      label: 'New Document',
      icon: <FileText className="h-4 w-4" />,
      onSelect: () => {
        onNewDoc?.()
        close()
      },
    },
    {
      id: 'new-folder',
      label: 'New Folder',
      icon: <FolderPlus className="h-4 w-4" />,
      onSelect: () => {
        onNewFolder?.()
        close()
      },
    },
    {
      id: 'toggle-theme',
      label: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onSelect: () => {
        setTheme(isDark ? 'light' : 'dark')
        close()
      },
    },
  ], [onNewDoc, onNewFolder, isDark, setTheme, close])

  // Search documents when query is present
  const searchResults: CommandAction[] = useMemo(() => {
    if (!query || query.length < 2 || !allNodes) return []
    
    const lowerQuery = query.toLowerCase()
    const results: CommandAction[] = []
    
    for (const node of allNodes) {
      // Search in title
      const titleMatch = node.title?.toLowerCase().includes(lowerQuery)
      
      // Search in content (if it exists and is an object with text)
      let contentMatch = false
      let contentSnippet = ''
      if (node.content && typeof node.content === 'object') {
        const contentStr = JSON.stringify(node.content)
        contentMatch = contentStr.toLowerCase().includes(lowerQuery)
        if (contentMatch) {
          // Try to extract a snippet around the match
          const idx = contentStr.toLowerCase().indexOf(lowerQuery)
          const start = Math.max(0, idx - 30)
          const end = Math.min(contentStr.length, idx + lowerQuery.length + 30)
          contentSnippet = '...' + contentStr.slice(start, end).replace(/[{}"[\]]/g, ' ').trim() + '...'
        }
      }
      
      if (titleMatch || contentMatch) {
        results.push({
          id: `doc-${node._id}`,
          label: node.title || 'Untitled',
          icon: node.type === 'folder' 
            ? <Folder className="h-4 w-4" /> 
            : <FileText className="h-4 w-4" />,
          shortcut: contentMatch && !titleMatch ? contentSnippet : undefined,
          onSelect: () => {
            router.push(`/app/${node.type}/${node._id}`)
            close()
          },
        })
      }
      
      // Limit results
      if (results.length >= 10) break
    }
    
    return results
  }, [query, allNodes, router, close])

  // Combine search results with filtered base actions
  const filteredActions = useMemo(() => {
    const lowerQuery = query.toLowerCase()
    const filteredBase = query
      ? baseActions.filter((action) =>
          action.label.toLowerCase().includes(lowerQuery)
        )
      : baseActions
    
    // If searching, show search results first, then matching actions
    if (query.length >= 2) {
      return [...searchResults, ...filteredBase]
    }
    
    return filteredBase
  }, [query, baseActions, searchResults])

  // Reset selected index when filtered actions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Global keyboard shortcuts (Cmd+K to open, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      // Global Escape handler - works even when focus is elsewhere
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        e.stopPropagation()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle, isOpen, close])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Keyboard navigation within palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < filteredActions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredActions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (filteredActions[selectedIndex]) {
            filteredActions[selectedIndex].onSelect()
          }
          break
        case 'Escape':
          e.preventDefault()
          close()
          break
      }
    },
    [filteredActions, selectedIndex, close]
  )

  const paletteContent = isOpen && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-background/80 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="fixed inset-0 z-[151] flex items-start justify-center pt-[20vh]">
        <div
          className="w-full max-w-lg bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Command className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents or type a command..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              ESC
            </kbd>
          </div>

          {/* Actions list */}
          <div className="max-h-[300px] overflow-y-auto py-2">
            {filteredActions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No commands found
              </div>
            ) : (
              filteredActions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={action.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors
                    ${index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent/50'
                    }
                  `}
                >
                  <span className="text-muted-foreground">{action.icon}</span>
                  <span className="flex-1 text-left">{action.label}</span>
                  {action.shortcut && (
                    <kbd className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {action.shortcut}
                    </kbd>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      {mounted && createPortal(paletteContent, document.body)}
    </CommandPaletteContext.Provider>
  )
}
