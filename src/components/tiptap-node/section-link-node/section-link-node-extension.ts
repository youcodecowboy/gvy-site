import { Node, mergeAttributes } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { SectionLinkNodeComponent } from "./section-link-node"

export interface SectionLinkNodeAttrs {
  /**
   * The Convex document ID to link to
   */
  docId: string | null
  /**
   * The document title for display
   */
  docTitle: string | null
  /**
   * Optional emoji or icon for the document
   */
  docIcon?: string | null
  /**
   * Custom label (e.g., "Next Section", "Related", etc.)
   * @default "Next Section"
   */
  label?: string | null
}

export interface SectionLinkNodeOptions extends Partial<SectionLinkNodeAttrs> {
  /**
   * HTML attributes to add to the section link node element
   * @default {}
   */
  HTMLAttributes: Record<string, any>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sectionLinkNode: {
      /**
       * Insert a section link node.
       *
       * Example:
       * editor.commands.insertSectionLink({ docId: "abc123", docTitle: "Getting Started" })
       */
      insertSectionLink: (attrs?: Partial<SectionLinkNodeAttrs>) => ReturnType
      /**
       * Update an existing section link node's attributes.
       */
      updateSectionLink: (attrs: Partial<SectionLinkNodeAttrs>) => ReturnType
    }
  }
}

/**
 * A Tiptap node extension that creates a stylized link block to another document.
 * Perfect for creating navigation between related documents.
 */
export const SectionLinkNode = Node.create<SectionLinkNodeOptions>({
  name: "sectionLinkNode",

  group: "block",

  draggable: true,

  selectable: true,

  atom: true,

  addOptions() {
    return {
      label: "Next Section",
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      docId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-doc-id"),
        renderHTML: (attrs: SectionLinkNodeAttrs) => {
          if (!attrs.docId) return {}
          return { "data-doc-id": attrs.docId }
        },
      },
      docTitle: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-doc-title"),
        renderHTML: (attrs: SectionLinkNodeAttrs) => {
          if (!attrs.docTitle) return {}
          return { "data-doc-title": attrs.docTitle }
        },
      },
      docIcon: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-doc-icon"),
        renderHTML: (attrs: SectionLinkNodeAttrs) => {
          if (!attrs.docIcon) return {}
          return { "data-doc-icon": attrs.docIcon }
        },
      },
      label: {
        default: "Next Section",
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-label") || "Next Section",
        renderHTML: (attrs: SectionLinkNodeAttrs) => {
          if (!attrs.label) return {}
          return { "data-label": attrs.label }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section-link-node"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "section-link-node",
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionLinkNodeComponent, {
      stopEvent: ({ event }) => {
        const el = event.target as HTMLElement | null
        if (!el) return false
        
        // Stop ALL events (keyboard, mouse, etc.) inside the picker or card
        // This prevents the editor from capturing keystrokes when typing in the search input
        return Boolean(
          el.closest(".section-link-picker") ||
          el.closest(".section-link-card") ||
          el.closest(".section-link-change-btn") ||
          el.tagName === "INPUT"
        )
      },
    })
  },

  addCommands() {
    return {
      insertSectionLink:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              label: this.options.label,
              ...attrs,
            },
          })
        },
      updateSectionLink:
        (attrs) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, attrs)
        },
    }
  },
})

export default SectionLinkNode
