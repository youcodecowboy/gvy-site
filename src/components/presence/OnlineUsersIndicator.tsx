'use client'

import { useState, useRef, useEffect } from 'react'
import { Users } from 'lucide-react'
import { usePresence } from '@/contexts/presence-context'
import { OnlineUsersDropdown } from './OnlineUsersDropdown'

export function OnlineUsersIndicator() {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { onlineCount, isLoading } = usePresence()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center justify-center rounded-md
          h-8 px-2 gap-1.5
          text-muted-foreground hover:text-foreground
          hover:bg-accent transition-colors
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
          disabled:pointer-events-none disabled:opacity-50
          relative
          ${isOpen ? 'bg-accent text-foreground' : ''}
        `}
        aria-label="Online users"
        title={`${onlineCount} user${onlineCount !== 1 ? 's' : ''} online`}
      >
        <Users className="h-4 w-4" />
        {!isLoading && (
          <span className="text-xs font-medium min-w-[1rem] text-center">
            {onlineCount > 99 ? '99+' : onlineCount}
          </span>
        )}
        {/* Online indicator dot */}
        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
      </button>

      {isOpen && (
        <div ref={dropdownRef}>
          <OnlineUsersDropdown onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  )
}
