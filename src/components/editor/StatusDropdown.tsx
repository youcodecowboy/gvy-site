'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Circle } from 'lucide-react'

type Status = 'draft' | 'in_review' | 'final'

interface StatusDropdownProps {
  status: Status
  onChange: (status: Status) => void
}

const statusConfig: Record<Status, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'text-muted-foreground' },
  in_review: { label: 'In Review', color: 'text-yellow-500' },
  final: { label: 'Final', color: 'text-green-500' },
}

export function StatusDropdown({ status, onChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const currentStatus = statusConfig[status]

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs border border-border rounded hover:bg-accent transition-colors"
      >
        <Circle className={`h-2 w-2 fill-current ${currentStatus.color}`} />
        <span>{currentStatus.label}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-32 bg-background border border-border rounded-md shadow-lg z-50">
          {(Object.keys(statusConfig) as Status[]).map((s) => {
            const config = statusConfig[s]
            return (
              <button
                key={s}
                onClick={() => {
                  onChange(s)
                  setIsOpen(false)
                }}
                className={`
                  flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left
                  hover:bg-accent transition-colors
                  ${s === status ? 'bg-accent/50' : ''}
                `}
              >
                <Circle className={`h-2 w-2 fill-current ${config.color}`} />
                {config.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
