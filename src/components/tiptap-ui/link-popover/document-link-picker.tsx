"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import type { Editor } from "@tiptap/react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"

// --- Icons ---
import { FileTextIcon } from "@/components/tiptap-icons/file-text-icon"
import { SearchIcon } from "@/components/tiptap-icons/search-icon"

// --- UI Primitives ---
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input"

import "./document-link-picker.scss"

interface DocumentResult {
  _id: Id<"nodes">
  title: string
  icon?: string | null
  updatedAt: number
}

export interface DocumentLinkPickerProps {
  editor: Editor | null
  onSelect?: (docId: string, docTitle: string, docIcon?: string | null) => void
  onClose?: () => void
}

export function DocumentLinkPicker({
  editor,
  onSelect,
  onClose,
}: DocumentLinkPickerProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Query documents from Convex
  const documents = useQuery(api.nodes.search, {
    query: searchQuery,
    limit: 8,
  }) as DocumentResult[] | undefined

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [documents])

  const handleSelect = useCallback(
    (doc: DocumentResult) => {
      if (!editor) return

      const docUrl = `/app/doc/${doc._id}`
      const linkText = doc.title || "Untitled"

      // Get current selection
      const { from, to } = editor.state.selection
      const hasSelection = from !== to

      if (hasSelection) {
        // Apply link to selected text
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: docUrl })
          .run()
      } else {
        // Insert new link with document title as text
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: linkText,
            marks: [{ type: "link", attrs: { href: docUrl } }],
          })
          .run()
      }

      onSelect?.(doc._id, doc.title, doc.icon)
      onClose?.()
    },
    [editor, onSelect, onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!documents || documents.length === 0) return

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < documents.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : documents.length - 1
          )
          break
        case "Enter":
          e.preventDefault()
          if (documents[selectedIndex]) {
            handleSelect(documents[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose?.()
          break
      }
    },
    [documents, selectedIndex, handleSelect, onClose]
  )

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="document-link-picker" onKeyDown={handleKeyDown}>
      <InputGroup className="document-link-picker-search">
        <SearchIcon className="document-link-picker-search-icon" />
        <Input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </InputGroup>

      <div className="document-link-picker-list">
        {!documents ? (
          <div className="document-link-picker-loading">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="document-link-picker-empty">
            {searchQuery ? "No documents found" : "No documents yet"}
          </div>
        ) : (
          documents.map((doc, index) => (
            <button
              key={doc._id}
              type="button"
              className={`document-link-picker-item ${
                index === selectedIndex ? "is-selected" : ""
              }`}
              onClick={() => handleSelect(doc)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="document-link-picker-item-icon">
                {doc.icon || <FileTextIcon />}
              </span>
              <span className="document-link-picker-item-content">
                <span className="document-link-picker-item-title">
                  {doc.title || "Untitled"}
                </span>
                <span className="document-link-picker-item-date">
                  {formatDate(doc.updatedAt)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default DocumentLinkPicker
