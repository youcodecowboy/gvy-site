'use client'

import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance } from 'tippy.js'
import { MentionList, type MentionListRef, type MentionItem } from './MentionList'

// Mock data for users - in production, fetch from Clerk
const mockUsers: MentionItem[] = [
  { id: 'user-1', label: 'John Doe', type: 'user', avatar: undefined },
  { id: 'user-2', label: 'Jane Smith', type: 'user', avatar: undefined },
  { id: 'user-3', label: 'Bob Johnson', type: 'user', avatar: undefined },
]

// This will be populated dynamically from Convex
let documentCache: MentionItem[] = []

export function setDocumentCache(docs: Array<{ id: string; title: string; icon?: string | null }>) {
  documentCache = docs.map(doc => ({
    id: doc.id,
    label: doc.title,
    type: 'document' as const,
    icon: doc.icon || '📄',
  }))
}

export function createMentionSuggestion() {
  return {
    items: ({ query }: { query: string }): MentionItem[] => {
      const searchQuery = query.toLowerCase()
      
      // Combine users and documents
      const allItems = [...mockUsers, ...documentCache]
      
      return allItems
        .filter(item => item.label.toLowerCase().includes(searchQuery))
        .slice(0, 10)
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null
      let popup: Instance[] | null = null

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          })

          if (!props.clientRect) {
            return
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: any) {
          component?.updateProps(props)

          if (!props.clientRect) {
            return
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          })
        },

        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
  }
}
