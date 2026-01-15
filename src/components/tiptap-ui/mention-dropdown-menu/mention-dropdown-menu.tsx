"use client"

import { useEffect, useMemo, useRef } from "react"
import type { Editor, Range } from "@tiptap/react"

// --- Lib ---
import { getElementOverflowPosition } from "@/lib/tiptap-collab-utils"

// --- Tiptap UI ---
import type {
  SuggestionItem,
  SuggestionMenuProps,
  SuggestionMenuRenderProps,
} from "@/components/tiptap-ui-utils/suggestion-menu"
import { SuggestionMenu } from "@/components/tiptap-ui-utils/suggestion-menu"

// --- UI Primitives ---
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/tiptap-ui-primitive/avatar"
import { Button, ButtonGroup } from "@/components/tiptap-ui-primitive/button"
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card"

interface User {
  id: string
  name: string
  role: string
  avatarUrl: string
}

type MentionDropdownMenuProps = Omit<SuggestionMenuProps, "items" | "children">

interface MentionItemProps {
  item: SuggestionItem<User>
  isSelected: boolean
  onSelect: () => void
}

// Fetch real organization members from Clerk
const fetchUsers = async (query: string): Promise<User[]> => {
  try {
    const response = await fetch(`/api/members?query=${encodeURIComponent(query)}`)
    
    if (!response.ok) {
      console.error('Failed to fetch members')
      return []
    }

    const data = await response.json()
    
    return data.members.map((member: any) => ({
      id: member.id,
      name: member.name,
      role: member.role === 'org:admin' ? 'Admin' : 
            member.role === 'org:member' ? 'Member' : 
            member.role || 'Member',
      avatarUrl: member.imageUrl || '',
    }))
  } catch (error) {
    console.error('Error fetching members:', error)
    return []
  }
}

export const MentionDropdownMenu = (props: MentionDropdownMenuProps) => {
  const handleItemSelect = (selectProps: {
    editor: Editor
    range: Range
    context?: User
  }) => {
    if (!selectProps.editor || !selectProps.range || !selectProps.context) return

    const { editor, range, context } = selectProps
    const docSize = editor.state.doc.content.size

    // Validate the range is within the document bounds
    if (range.from < 0 || range.to > docSize || range.from > range.to) {
      console.warn('Mention range is out of bounds, inserting at current selection instead')
      // Fallback: insert at current cursor position
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "mention",
            attrs: {
              id: context.id,
              label: context.name,
            },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run()
      return
    }

    try {
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          {
            type: "mention",
            attrs: {
              id: context.id,
              label: context.name,
            },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run()
    } catch (error) {
      console.error('Failed to insert mention at range, trying current selection:', error)
      // Fallback: insert at current cursor position
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "mention",
            attrs: {
              id: context.id,
              label: context.name,
            },
          },
          {
            type: "text",
            text: " ",
          },
        ])
        .run()
    }
  }

  const getSuggestionItems = async (props: { query: string }) => {
    const users = await fetchUsers(props.query)

    return users.map((user) => ({
      title: user.name,
      subtext: user.name,
      context: user,
      onSelect: handleItemSelect,
    }))
  }

  return (
    <SuggestionMenu
      char="@"
      pluginKey="mentionDropdownMenu"
      decorationClass="tiptap-mention-decoration"
      selector="tiptap-mention-dropdown-menu"
      items={getSuggestionItems}
      {...props}
    >
      {(props) => <MentionList {...props} />}
    </SuggestionMenu>
  )
}

const MentionItem = ({ item, isSelected, onSelect }: MentionItemProps) => {
  const itemRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const menuElement = document.querySelector(
      '[data-selector="tiptap-mention-dropdown-menu"]'
    ) as HTMLElement
    if (!itemRef.current || !isSelected || !menuElement) return

    const overflow = getElementOverflowPosition(itemRef.current, menuElement)
    if (overflow === "top") {
      itemRef.current.scrollIntoView(true)
    } else if (overflow === "bottom") {
      itemRef.current.scrollIntoView(false)
    }
  }, [isSelected])

  return (
    <Button
      ref={itemRef}
      data-style="ghost"
      data-active-state={isSelected ? "on" : "off"}
      onClick={onSelect}
      data-user-id={item.context?.id}
    >
      <Avatar>
        <AvatarImage src={item.context?.avatarUrl} alt={item.title} />
        <AvatarFallback>{item.title[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>

      <span className="tiptap-button-text">{item.title}</span>
    </Button>
  )
}

const MentionList = ({
  items,
  selectedIndex,
  onSelect,
}: SuggestionMenuRenderProps<User>) => {
  const renderedItems = useMemo(() => {
    const rendered: React.ReactElement[] = []

    items.forEach((item, index) => {
      rendered.push(
        <MentionItem
          key={item.context?.id || item.title}
          item={item}
          isSelected={index === selectedIndex}
          onSelect={() => onSelect(item)}
        />
      )
    })

    return rendered
  }, [items, selectedIndex, onSelect])

  if (!renderedItems.length) {
    return null
  }

  return (
    <Card
      style={{
        maxHeight: "var(--suggestion-menu-max-height)",
      }}
    >
      <CardBody>
        <ButtonGroup>{renderedItems}</ButtonGroup>
      </CardBody>
    </Card>
  )
}
