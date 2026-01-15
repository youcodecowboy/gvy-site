'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Tag {
  _id: Id<'tags'>
  name: string
  displayName: string
  usageCount: number
}

interface TagsInputProps {
  tagIds: Id<'tags'>[]
  onChange: (tagIds: Id<'tags'>[]) => void
}

export function TagsInput({ tagIds = [], onChange }: TagsInputProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Mutations
  const getOrCreateTag = useMutation(api.tags.getOrCreate)

  // Get current tags data
  const currentTags = useQuery(
    api.tags.getByIds, 
    tagIds && tagIds.length > 0 ? { tagIds } : "skip"
  )
  
  // Search for tags
  const searchResults = useQuery(
    api.tags.list,
    inputValue.trim() ? { search: inputValue.trim(), limit: 10 } : { limit: 20 }
  )

  // Filter out tags that are already selected
  const availableSuggestions = searchResults?.filter(
    (tag) => !tagIds.includes(tag._id)
  ) || []

  // Show "Create new tag" option if input doesn't match any existing tag (check all results, not just available)
  const normalizedInput = inputValue.toLowerCase().trim()
  const exactMatch = searchResults?.find(
    (tag) => tag.name === normalizedInput
  )
  const showCreateOption = normalizedInput.length > 0 && !exactMatch

  // Create suggestions list with create option at top if needed
  const suggestions = showCreateOption
    ? [
        { _id: null as any, displayName: `Create "${inputValue.trim()}"`, name: inputValue.toLowerCase().trim(), usageCount: 0, isCreate: true },
        ...availableSuggestions
      ]
    : availableSuggestions

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
        setIsAdding(false)
        setInputValue('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addTag = useCallback(async (tagIdOrCreate?: Id<'tags'> | 'create') => {
    if (tagIdOrCreate === 'create' || !tagIdOrCreate) {
      // Create new tag from input
      const trimmed = inputValue.trim()
      if (!trimmed) return

      try {
        const newTagId = await getOrCreateTag({ name: trimmed })
        if (newTagId && !tagIds.includes(newTagId)) {
          onChange([...tagIds, newTagId])
        }
      } catch (error) {
        console.error('Failed to create tag:', error)
      }
    } else {
      // Add existing tag
      if (!tagIds.includes(tagIdOrCreate)) {
        onChange([...tagIds, tagIdOrCreate])
      }
    }

    setInputValue('')
    setIsAdding(false)
    setShowSuggestions(false)
    setSelectedIndex(0)
  }, [inputValue, tagIds, onChange, getOrCreateTag])

  const removeTag = useCallback(
    (tagIdToRemove: Id<'tags'>) => {
      onChange(tagIds.filter((id) => id !== tagIdToRemove))
    },
    [tagIds, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        const selected = suggestions[selectedIndex]
        if (selected) {
          addTag((selected as any).isCreate ? 'create' : selected._id)
        }
      } else {
        addTag('create')
      }
    }
    if (e.key === 'Escape') {
      setIsAdding(false)
      setInputValue('')
      setShowSuggestions(false)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % suggestions.length)
      }
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (showSuggestions && suggestions.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      }
    }
    if (e.key === 'Backspace' && !inputValue && tagIds.length > 0) {
      removeTag(tagIds[tagIds.length - 1])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setShowSuggestions(true)
    setSelectedIndex(0)
  }

  const handleInputFocus = () => {
    setShowSuggestions(true)
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1.5 flex-wrap relative">
      <span className="text-xs text-muted-foreground">Tags:</span>
      
      {currentTags?.map((tag) => (
        <span
          key={tag._id}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted rounded-full group"
        >
          {tag.displayName}
          <button
            onClick={() => removeTag(tag._id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
          </button>
        </span>
      ))}
      
      {isAdding ? (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder="Search or create tag..."
            className="w-40 px-2 py-0.5 text-xs bg-muted rounded-full focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          
          {showSuggestions && (availableSuggestions.length > 0 || showCreateOption) && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 mt-1 z-50 min-w-[200px] max-w-[300px] bg-background border border-border rounded-md shadow-lg max-h-[200px] overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => {
                const isCreate = (suggestion as any).isCreate
                return (
                  <button
                    key={isCreate ? 'create' : suggestion._id}
                    onClick={() => addTag(isCreate ? 'create' : suggestion._id)}
                    className={`
                      w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors
                      ${index === selectedIndex ? 'bg-accent' : ''}
                      ${isCreate ? 'text-primary font-medium' : ''}
                    `}
                  >
                    {isCreate ? (
                      <div className="flex items-center gap-2">
                        <Plus className="h-3 w-3" />
                        <span>{suggestion.displayName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span>{suggestion.displayName}</span>
                        {suggestion.usageCount > 0 && (
                          <span className="text-muted-foreground text-[10px]">
                            {suggestion.usageCount}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => {
            setIsAdding(true)
            setShowSuggestions(true)
          }}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  )
}
