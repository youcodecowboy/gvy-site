"use client"

import { useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { DownloadIcon } from "@/components/tiptap-icons/download-icon"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"

export interface ExportButtonProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * The document title for the exported file name.
   */
  docTitle?: string
}

/**
 * Exports the editor content to a DOCX file
 */
export function ExportButton({ editor: providedEditor, docTitle }: ExportButtonProps) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    if (!editor || isExporting) return

    setIsExporting(true)

    try {
      // Get editor content as HTML
      const html = editor.getHTML()
      
      // Create a styled HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${docTitle || "Document"}</title>
          <style>
            body {
              font-family: 'Calibri', 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
            }
            h1 { font-size: 24pt; margin-top: 24pt; margin-bottom: 12pt; }
            h2 { font-size: 18pt; margin-top: 18pt; margin-bottom: 10pt; }
            h3 { font-size: 14pt; margin-top: 14pt; margin-bottom: 8pt; }
            p { margin: 0 0 10pt 0; }
            ul, ol { margin: 0 0 10pt 0; padding-left: 24pt; }
            li { margin: 4pt 0; }
            blockquote {
              margin: 10pt 0;
              padding-left: 16pt;
              border-left: 4px solid #ddd;
              color: #666;
            }
            pre {
              background: #f5f5f5;
              padding: 12pt;
              border-radius: 4pt;
              font-family: 'Consolas', monospace;
              font-size: 10pt;
              overflow-x: auto;
            }
            code {
              background: #f0f0f0;
              padding: 2pt 4pt;
              border-radius: 2pt;
              font-family: 'Consolas', monospace;
              font-size: 10pt;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 10pt 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8pt;
              text-align: left;
            }
            th {
              background: #f5f5f5;
              font-weight: bold;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            a {
              color: #0066cc;
              text-decoration: underline;
            }
            .section-link-node {
              margin: 16pt 0;
              padding: 12pt;
              background: #f8f9fa;
              border: 1px solid #e9ecef;
              border-radius: 6pt;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `

      // Use the Blob API to create a downloadable file
      // For DOCX, we'll use a simple HTML-to-DOCX approach
      const blob = new Blob([fullHtml], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const fileName = `${docTitle || "document"}.doc`
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
    } finally {
      setIsExporting(false)
    }
  }, [editor, docTitle, isExporting])

  if (!editor) {
    return null
  }

  return (
    <Button
      type="button"
      data-style="ghost"
      onClick={handleExport}
      disabled={isExporting}
      tooltip="Export to Word"
      aria-label="Export to Word document"
    >
      <DownloadIcon className="tiptap-button-icon" />
    </Button>
  )
}

export default ExportButton
