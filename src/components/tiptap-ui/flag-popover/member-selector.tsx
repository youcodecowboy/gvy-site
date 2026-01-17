'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, User, ChevronDown, Check } from 'lucide-react'

export interface Member {
  id: string
  name: string
  email: string
  imageUrl: string
  role: string
}

interface MemberSelectorProps {
  selectedMember: Member | null
  onSelect: (member: Member) => void
  excludeUserId?: string
}

export function MemberSelector({ selectedMember, onSelect, excludeUserId }: MemberSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch members from the API
  const fetchMembers = useCallback(async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/members?query=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        // Filter out the current user
        const filteredMembers = excludeUserId
          ? data.members.filter((m: Member) => m.id !== excludeUserId)
          : data.members
        setMembers(filteredMembers)
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setIsLoading(false)
    }
  }, [excludeUserId])

  // Initial fetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchMembers(query)
      inputRef.current?.focus()
    }
  }, [isOpen, fetchMembers, query])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    fetchMembers(e.target.value)
  }

  const handleSelect = (member: Member) => {
    onSelect(member)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between px-3 py-2 text-sm
          border border-border rounded-md bg-background
          hover:bg-accent/50 transition-colors
          ${isOpen ? 'ring-2 ring-primary' : ''}
        `}
      >
        {selectedMember ? (
          <div className="flex items-center gap-2">
            {selectedMember.imageUrl ? (
              <img
                src={selectedMember.imageUrl}
                alt={selectedMember.name}
                className="h-5 w-5 rounded-full"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-3 w-3 text-primary" />
              </div>
            )}
            <span className="truncate">{selectedMember.name}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Select a person...</span>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-md shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleSearchChange}
                placeholder="Search members..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Members list */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : members.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">
                {query ? 'No members found' : 'No team members available'}
              </div>
            ) : (
              members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleSelect(member)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 text-left
                    hover:bg-accent/50 transition-colors
                    ${selectedMember?.id === member.id ? 'bg-accent' : ''}
                  `}
                >
                  {member.imageUrl ? (
                    <img
                      src={member.imageUrl}
                      alt={member.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  {selectedMember?.id === member.id && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
