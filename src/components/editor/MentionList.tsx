'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react'

export interface MentionItem {
  id: string
  label: string
  type: 'user' | 'document'
  avatar?: string
  icon?: string
}

export interface MentionListProps {
  items: MentionItem[]
  command: (item: MentionItem) => void
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) {
          command(item)
        }
      },
      [items, command]
    )

    const upHandler = useCallback(() => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length)
    }, [items.length, selectedIndex])

    const downHandler = useCallback(() => {
      setSelectedIndex((selectedIndex + 1) % items.length)
    }, [items.length, selectedIndex])

    const enterHandler = useCallback(() => {
      selectItem(selectedIndex)
    }, [selectItem, selectedIndex])

    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler()
          return true
        }

        if (event.key === 'ArrowDown') {
          downHandler()
          return true
        }

        if (event.key === 'Enter') {
          enterHandler()
          return true
        }

        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="mention-list-empty">
          No results found
        </div>
      )
    }

    return (
      <div className="mention-list">
        {items.map((item, index) => (
          <button
            key={item.id}
            className={`mention-list-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            {item.type === 'user' ? (
              <div className="mention-avatar">
                {item.avatar ? (
                  <img src={item.avatar} alt={item.label} />
                ) : (
                  <span>{item.label.charAt(0).toUpperCase()}</span>
                )}
              </div>
            ) : (
              <div className="mention-icon">
                {item.icon || '📄'}
              </div>
            )}
            <div className="mention-info">
              <span className="mention-label">{item.label}</span>
              <span className="mention-type">
                {item.type === 'user' ? 'User' : 'Document'}
              </span>
            </div>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = 'MentionList'
