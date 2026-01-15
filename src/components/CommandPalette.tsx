'use client'

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from 'next-themes'
import {
  FileText,
  FolderPlus,
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
  const { theme, setTheme } = useTheme()

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

  // Actions
  const actions: CommandAction[] = [
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
      id: 'search',
      label: 'Search...',
      icon: <Search className="h-4 w-4" />,
      onSelect: () => {
        // TODO: Implement search
        console.log('Search')
        close()
      },
    },
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onSelect: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
        close()
      },
    },
  ]

  // Filter actions by query
  const filteredActions = query
    ? actions.filter((action) =>
        action.label.toLowerCase().includes(query.toLowerCase())
      )
    : actions

  // Reset selected index when filtered actions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

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
              placeholder="Type a command..."
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
