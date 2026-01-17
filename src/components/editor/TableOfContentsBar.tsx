'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, List, ArrowUp, X } from 'lucide-react'
import { useToc } from '@/components/tiptap-node/toc-node/context/toc-context'
import type { TableOfContentDataItem } from '@tiptap/extension-table-of-contents'

interface TableOfContentsBarProps {
  className?: string
}

const STORAGE_KEY = 'groovy-docs-toc-expanded'

export function TableOfContentsBar({ className = '' }: TableOfContentsBarProps) {
  const { tocContent, normalizeHeadingDepths } = useToc()
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasAnchor, setHasAnchor] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Check for anchor in URL
  useEffect(() => {
    const checkAnchor = () => {
      setHasAnchor(window.location.hash.length > 1)
    }
    checkAnchor()
    window.addEventListener('hashchange', checkAnchor)
    return () => window.removeEventListener('hashchange', checkAnchor)
  }, [])

  // Load expanded state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        setIsExpanded(stored === 'true')
      }
    } catch {
      // localStorage not available
    }
  }, [])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsExpanded(false)
        try {
          localStorage.setItem(STORAGE_KEY, 'false')
        } catch {
          // ignore
        }
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded])

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const newValue = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue))
      } catch {
        // localStorage not available
      }
      return newValue
    })
  }, [])

  const headingList = useMemo(() => tocContent ?? [], [tocContent])

  const normalizedDepths = useMemo(
    () => normalizeHeadingDepths(headingList),
    [headingList, normalizeHeadingDepths]
  )

  // Find the active heading (last one that's marked active by scroll position)
  const activeHeadingId = useMemo(() => {
    const activeHeadings = headingList.filter((h) => h.isActive)
    return activeHeadings.length > 0
      ? activeHeadings[activeHeadings.length - 1].id
      : null
  }, [headingList])

  // Navigate to heading using scrollIntoView
  const handleHeadingClick = useCallback(
    (e: React.MouseEvent, item: TableOfContentDataItem) => {
      e.preventDefault()

      // Close the dropdown first
      setIsExpanded(false)
      try {
        localStorage.setItem(STORAGE_KEY, 'false')
      } catch {
        // ignore
      }

      // Update URL hash - this enables back-to-top functionality
      if (item.id) {
        window.history.pushState(null, '', `#${item.id}`)
        setHasAnchor(true)
      }

      // Scroll to the element using scrollIntoView
      if (item.dom) {
        // Small delay to let dropdown close first
        setTimeout(() => {
          item.dom.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
        }, 50)
      }
    },
    []
  )

  // Clear anchor and go back to top
  const handleBackToTop = useCallback(() => {
    // Remove hash from URL
    window.history.pushState(null, '', window.location.pathname)
    setHasAnchor(false)

    // Scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [])

  // Get heading style based on level
  const getHeadingStyle = (level: number) => {
    switch (level) {
      case 1:
        return 'text-sm font-semibold text-foreground'
      case 2:
        return 'text-xs font-medium text-foreground/80'
      case 3:
      default:
        return 'text-[11px] font-normal text-muted-foreground'
    }
  }

  // Don't render anything if there are no headings
  if (headingList.length === 0) {
    return null
  }

  return (
    <>
      <div ref={dropdownRef} className={`relative ${className}`}>
        {/* Toggle button - inline style */}
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Table of contents"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0" />
          )}
          <List className="h-3 w-3 shrink-0" />
          <span>Contents</span>
          <span className="px-1.5 py-0.5 bg-muted rounded-full text-[10px] tabular-nums">
            {headingList.length}
          </span>
        </button>

        {/* Dropdown content */}
        {isExpanded && (
          <nav
            className="absolute top-full left-0 mt-1 z-50 min-w-72 max-w-md border border-border rounded-md bg-white dark:bg-zinc-900 shadow-xl overflow-hidden"
            aria-label="Table of contents"
          >
            <div className="px-3 py-2 border-b border-border bg-muted/50">
              <span className="text-xs font-medium text-muted-foreground">
                Jump to section
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {headingList.map((item, index) => {
                const depth = normalizedDepths[index] ?? 1
                const level = item.level ?? 1
                const isActive = item.id === activeHeadingId
                const paddingLeft = 12 + (depth - 1) * 16

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => handleHeadingClick(e, item)}
                    className={`
                      block py-2 pr-3 truncate transition-colors
                      ${getHeadingStyle(level)}
                      ${
                        isActive
                          ? 'bg-primary/10 !text-primary border-l-2 border-primary'
                          : 'hover:bg-muted border-l-2 border-transparent'
                      }
                    `}
                    style={{ paddingLeft }}
                    title={item.textContent}
                  >
                    {item.textContent || 'Untitled'}
                  </a>
                )
              })}
            </div>
          </nav>
        )}
      </div>

      {/* Back to top floating button - shows when there's an anchor */}
      {hasAnchor && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
          <button
            onClick={handleBackToTop}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium bg-white dark:bg-zinc-800 border border-border rounded-full shadow-lg hover:bg-muted transition-colors"
            title="Back to top (clears anchor)"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Back to top</span>
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}
    </>
  )
}
