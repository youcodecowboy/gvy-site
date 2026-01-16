"use client"

import { useCallback, useState, useEffect } from "react"
import { NodeViewWrapper } from "@tiptap/react"
import type { NodeViewProps } from "@tiptap/react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { useOrganization } from "@clerk/nextjs"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"

// --- Icons ---
import { FileTextIcon } from "@/components/tiptap-icons/file-text-icon"
import { ArrowRightIcon } from "@/components/tiptap-icons/arrow-right-icon"
import { SearchIcon } from "@/components/tiptap-icons/search-icon"

// --- UI Primitives ---
import { Input, InputGroup } from "@/components/tiptap-ui-primitive/input"

import "./section-link-node.scss"

interface DocumentResult {
  _id: Id<"nodes">
  title: string
  icon?: string | null
  updatedAt: number
}

/**
 * Document picker component for selecting a document to link to
 */
function SectionLinkPicker({
  onSelect,
  onClose,
  orgId,
}: {
  onSelect: (doc: DocumentResult) => void
  onClose: () => void
  orgId?: string
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Query documents from Convex - include orgId if available
  const documents = useQuery(api.nodes.search, {
    query: searchQuery,
    orgId: orgId,
    limit: 6,
  }) as DocumentResult[] | undefined

  useEffect(() => {
    setSelectedIndex(0)
  }, [documents])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Stop propagation to prevent editor from handling these keys
      e.stopPropagation()
      
      if (!documents || documents.length === 0) {
        if (e.key === "Escape") {
          e.preventDefault()
          onClose()
        }
        return
      }

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
            onSelect(documents[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          onClose()
          break
      }
    },
    [documents, selectedIndex, onSelect, onClose]
  )

  return (
    <div className="section-link-picker" onKeyDown={handleKeyDown}>
      <div className="section-link-picker-header">
        <span>Select a document</span>
      </div>
      <InputGroup className="section-link-picker-search">
        <SearchIcon className="section-link-picker-search-icon" />
        <Input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => {
            e.stopPropagation()
            setSearchQuery(e.target.value)
          }}
          onKeyDown={(e) => {
            // Prevent all keyboard events from bubbling to the editor
            e.stopPropagation()
            handleKeyDown(e)
          }}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </InputGroup>

      <div className="section-link-picker-list">
        {!documents ? (
          <div className="section-link-picker-loading">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="section-link-picker-empty">
            {searchQuery ? "No documents found" : "No documents yet"}
          </div>
        ) : (
          documents.map((doc, index) => (
            <button
              key={doc._id}
              type="button"
              className={`section-link-picker-item ${
                index === selectedIndex ? "is-selected" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(doc)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="section-link-picker-item-icon">
                {doc.icon || <FileTextIcon />}
              </span>
              <span className="section-link-picker-item-title">
                {doc.title || "Untitled"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Section Link Node component
 */
export function SectionLinkNodeComponent(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props
  const router = useRouter()
  const { organization } = useOrganization()
  const [showPicker, setShowPicker] = useState(false)

  const attrs = node.attrs ?? {}
  const { docId, docTitle, docIcon, label } = attrs

  const hasDocument = docId && docTitle

  const handleNavigate = useCallback(() => {
    if (docId) {
      router.push(`/app/doc/${docId}`)
    }
  }, [router, docId])

  const handleSelectDocument = useCallback(
    (doc: DocumentResult) => {
      updateAttributes({
        docId: doc._id,
        docTitle: doc.title,
        docIcon: doc.icon || null,
      })
      setShowPicker(false)
    },
    [updateAttributes]
  )

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!hasDocument) {
        setShowPicker(true)
      } else {
        handleNavigate()
      }
    },
    [hasDocument, handleNavigate]
  )

  // Show picker on initial insert if no document selected
  useEffect(() => {
    if (!hasDocument && selected) {
      setShowPicker(true)
    }
  }, [hasDocument, selected])

  return (
    <NodeViewWrapper className="section-link-node-wrapper">
      <div
        className={`section-link-node ${selected ? "is-selected" : ""}`}
        data-has-document={hasDocument ? "true" : "false"}
      >
        <div className="section-link-label">{label || "Next Section"}</div>

        {showPicker ? (
          <SectionLinkPicker
            onSelect={handleSelectDocument}
            onClose={() => setShowPicker(false)}
            orgId={organization?.id}
          />
        ) : (
          <button
            type="button"
            className="section-link-card"
            onClick={handleCardClick}
          >
            <span className="section-link-card-icon">
              {docIcon || <FileTextIcon />}
            </span>
            <span className="section-link-card-content">
              <span className="section-link-card-title">
                {docTitle || "Click to select a document"}
              </span>
            </span>
            <ArrowRightIcon className="section-link-card-arrow" />
          </button>
        )}

        {hasDocument && (
          <button
            type="button"
            className="section-link-change-btn"
            onClick={(e) => {
              e.stopPropagation()
              setShowPicker(true)
            }}
          >
            Change
          </button>
        )}
      </div>
    </NodeViewWrapper>
  )
}

export default SectionLinkNodeComponent
