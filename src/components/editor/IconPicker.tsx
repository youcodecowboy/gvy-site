'use client'

import { useState, useRef, useEffect } from 'react'
import { FileText, Smile, X } from 'lucide-react'

const COMMON_ICONS = [
  '📄', '📝', '📋', '📑', '🗒️', '📓', '📔', '📒',
  '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🏷️',
  '💡', '✨', '⭐', '🌟', '💫', '🎯', '🎨', '🎭',
  '💼', '📊', '📈', '📉', '🗂️', '📁', '📂', '🗃️',
  '💻', '🖥️', '⌨️', '🖱️', '🔧', '⚙️', '🛠️', '🔨',
  '🚀', '✈️', '🌍', '🌎', '🌏', '🏠', '🏢', '🏗️',
  '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍',
  '✅', '❌', '⚠️', 'ℹ️', '❓', '❗', '💬', '💭',
]

interface IconPickerProps {
  icon: string | null | undefined
  onChange: (icon: string | null) => void
}

export function IconPicker({ icon, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelectIcon = (selectedIcon: string) => {
    onChange(selectedIcon)
    setIsOpen(false)
  }

  const handleRemoveIcon = () => {
    onChange(null)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        title="Change icon"
      >
        {icon ? (
          <span className="text-2xl leading-none">{icon}</span>
        ) : (
          <FileText className="h-6 w-6" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg p-3 w-[280px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Choose an icon</span>
            {icon && (
              <button
                onClick={handleRemoveIcon}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {COMMON_ICONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelectIcon(emoji)}
                className={`
                  w-8 h-8 flex items-center justify-center rounded hover:bg-accent transition-colors text-lg
                  ${icon === emoji ? 'bg-accent ring-2 ring-primary' : ''}
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
