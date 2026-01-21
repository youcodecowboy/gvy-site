import { generateJSON, JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { TextAlign } from '@tiptap/extension-text-align'
import { Highlight } from '@tiptap/extension-highlight'
import { Superscript } from '@tiptap/extension-superscript'
import { Subscript } from '@tiptap/extension-subscript'
import { Underline } from '@tiptap/extension-underline'
import { Link } from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'

/**
 * Converts HTML to TipTap-compatible JSON format.
 * Uses a subset of extensions that match the main editor configuration.
 */
export function htmlToTiptapJSON(html: string): JSONContent {
  // Use extensions that match the main editor for compatibility
  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Highlight.configure({ multicolor: true }),
    Superscript,
    Subscript,
    Underline,
    Link.configure({ openOnClick: false }),
    Image.configure({
      inline: false,
      allowBase64: true,
    }),
  ]

  // Wrap in a div if the HTML doesn't start with a block element
  let processedHtml = html.trim().startsWith('<') ? html : `<p>${html}</p>`

  // Unwrap images from paragraphs - mammoth generates <p><img></p> but TipTap
  // needs block-level images outside of paragraphs.
  // This regex handles paragraphs that ONLY contain an image (with optional whitespace)
  processedHtml = processedHtml.replace(/<p>(\s*)<img /gi, '<img ')
  processedHtml = processedHtml.replace(/(<img[^>]*>)(\s*)<\/p>/gi, '$1')

  try {
    return generateJSON(processedHtml, extensions)
  } catch (error) {
    console.error('Error converting HTML to TipTap JSON:', error)
    // Return a simple paragraph with the raw text as fallback
    return {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: html.replace(/<[^>]+>/g, ''),
            },
          ],
        },
      ],
    }
  }
}

/**
 * Validates that the generated JSON is a valid TipTap document structure.
 */
export function isValidTiptapDoc(json: JSONContent): boolean {
  return (
    json &&
    json.type === 'doc' &&
    Array.isArray(json.content) &&
    json.content.length > 0
  )
}

/**
 * Ensures the document has at least one block element.
 */
export function ensureNonEmptyDoc(json: JSONContent): JSONContent {
  if (isValidTiptapDoc(json)) {
    return json
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  }
}
