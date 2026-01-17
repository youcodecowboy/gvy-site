"use client"

import { forwardRef, useCallback, useState } from "react"
import type { Editor } from "@tiptap/react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"

// --- Icons ---
import { DownloadIcon } from "@/components/tiptap-icons/download-icon"
import { FileText, FileIcon, History, Loader2 } from "lucide-react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Modal } from "@/components/ui"

export interface ExportDropdownProps {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null
  /**
   * Document ID for logging exports
   */
  docId: string
  /**
   * The document title for the exported file name.
   */
  docTitle: string
  /**
   * Current version string (e.g., "v1.2")
   */
  versionString?: string
}

/**
 * Export modal component for exporting to PDF or DOCX
 */
export const ExportDropdown = forwardRef<HTMLButtonElement, ExportDropdownProps>(
  ({ editor: providedEditor, docId, docTitle, versionString }, ref) => {
    const { editor } = useTiptapEditor(providedEditor)
    const [isOpen, setIsOpen] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | null>(null)
    const [showHistory, setShowHistory] = useState(false)

    const logExport = useMutation(api.exports.logExport)
    const exportHistory = useQuery(api.exports.getExportHistory, {
      docId: docId as Id<"nodes">,
      limit: 10,
    })

    const handleExportPdf = useCallback(async () => {
      if (!editor || isExporting) return

      setIsExporting(true)
      setExportFormat('pdf')

      try {
        const html = editor.getHTML()

        const response = await fetch('/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            title: docTitle,
            options: {
              showVersion: true,
              versionString: versionString || 'v1.0',
              showPageNumbers: true,
            },
          }),
        })

        if (!response.ok) {
          throw new Error('PDF export failed')
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        // Use filename from Content-Disposition header if available, otherwise construct it
        const version = versionString || 'v1.0'
        link.download = `${docTitle || 'document'} (${version}).pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // Log export to history
        await logExport({
          docId: docId as Id<"nodes">,
          versionString: versionString || 'v1.0',
          format: 'pdf',
          docTitle: docTitle || 'Untitled',
          fileSize: blob.size,
        })

        setIsOpen(false)
      } catch (error) {
        console.error('PDF export failed:', error)
      } finally {
        setIsExporting(false)
        setExportFormat(null)
      }
    }, [editor, docId, docTitle, versionString, logExport, isExporting])

    const handleExportDocx = useCallback(async () => {
      if (!editor || isExporting) return

      setIsExporting(true)
      setExportFormat('docx')

      try {
        // Get editor content as HTML with styling
        const html = editor.getHTML()

        // Create a styled HTML document with Arial font (matching PDF export)
        const version = versionString || 'v1.0'
        const fullHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${docTitle || "Document"}</title>
            <style>
              body {
                font-family: 'Arial', 'Helvetica Neue', 'Helvetica', sans-serif;
                font-size: 9.5pt;
                line-height: 1.5;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                color: #222;
              }
              h1 { font-size: 14pt; font-weight: 600; margin-top: 16pt; margin-bottom: 10pt; color: #111; }
              h2 { font-size: 12pt; font-weight: 600; margin-top: 14pt; margin-bottom: 8pt; color: #222; }
              h3 { font-size: 11pt; font-weight: 600; margin-top: 12pt; margin-bottom: 6pt; color: #333; }
              h4, h5, h6 { font-size: 10pt; font-weight: 600; margin-top: 10pt; margin-bottom: 5pt; color: #444; }
              p { margin: 0 0 8pt 0; }
              ul, ol { margin: 0 0 8pt 0; padding-left: 18pt; }
              li { margin: 2pt 0; }
              blockquote {
                margin: 10pt 0;
                padding: 8pt 12pt;
                border-left: 2px solid #ddd;
                background: #fafafa;
                color: #555;
                font-size: 9pt;
              }
              pre {
                background: #f6f6f6;
                padding: 8pt;
                border-radius: 3pt;
                font-family: 'Consolas', 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 8pt;
                overflow-x: auto;
                border: 1px solid #e5e5e5;
              }
              code {
                background: #f3f3f3;
                padding: 1pt 2pt;
                border-radius: 2pt;
                font-family: 'Consolas', 'Monaco', 'Menlo', 'Courier New', monospace;
                font-size: 8pt;
              }
              pre code { background: none; padding: 0; }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 10pt 0;
                font-size: 9pt;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 5pt 6pt;
                text-align: left;
                vertical-align: top;
              }
              th {
                background: #f5f5f5;
                font-weight: 600;
              }
              tr:nth-child(even) td { background: #fafafa; }
              img {
                max-width: 100%;
                height: auto;
              }
              a {
                color: #0066cc;
                text-decoration: none;
              }
              hr {
                border: none;
                border-top: 1px solid #e0e0e0;
                margin: 16pt 0;
              }
              .section-link-node {
                margin: 10pt 0;
                padding: 8pt 12pt;
                background: #f8f9fa;
                border: 1px solid #e9ecef;
                border-radius: 3pt;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
          </html>
        `

        // Create blob and download
        const blob = new Blob([fullHtml], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        })

        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${docTitle || "document"} (${version}).doc`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        // Log export to history
        await logExport({
          docId: docId as Id<"nodes">,
          versionString: versionString || 'v1.0',
          format: 'docx',
          docTitle: docTitle || 'Untitled',
          fileSize: blob.size,
        })

        setIsOpen(false)
      } catch (error) {
        console.error('DOCX export failed:', error)
      } finally {
        setIsExporting(false)
        setExportFormat(null)
      }
    }, [editor, docId, docTitle, versionString, logExport, isExporting])

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    }

    if (!editor) {
      return null
    }

    return (
      <>
        {/* Trigger Button */}
        <Button
          type="button"
          data-style="ghost"
          disabled={isExporting}
          tooltip="Export document"
          aria-label="Export document"
          ref={ref}
          onClick={() => setIsOpen(true)}
        >
          {isExporting ? (
            <Loader2 className="tiptap-button-icon animate-spin" />
          ) : (
            <DownloadIcon className="tiptap-button-icon" />
          )}
        </Button>

        {/* Export Modal */}
        <Modal
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false)
            setShowHistory(false)
          }}
          title="Export Document"
          size="sm"
        >
          <div className="p-4 space-y-4">
            {/* Export Format Options */}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                Choose an export format:
              </p>

              {/* PDF Export */}
              <button
                onClick={handleExportPdf}
                disabled={isExporting}
                className="flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportFormat === 'pdf' ? (
                  <Loader2 className="h-5 w-5 text-red-500 animate-spin shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <div>
                  <div className="font-medium text-sm">Export as PDF</div>
                  <div className="text-xs text-muted-foreground">
                    Best for sharing and printing
                  </div>
                </div>
              </button>

              {/* DOCX Export */}
              <button
                onClick={handleExportDocx}
                disabled={isExporting}
                className="flex items-center gap-3 w-full px-4 py-3 text-left rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportFormat === 'docx' ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <FileIcon className="h-5 w-5 text-blue-500 shrink-0" />
                )}
                <div>
                  <div className="font-medium text-sm">Export as Word (.doc)</div>
                  <div className="text-xs text-muted-foreground">
                    Best for editing in Microsoft Word
                  </div>
                </div>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-border" />

            {/* Export History Toggle */}
            <div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span>Export History</span>
                </div>
                {exportHistory && exportHistory.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full">
                    {exportHistory.length}
                  </span>
                )}
              </button>

              {/* Export History List */}
              {showHistory && (
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                  {!exportHistory || exportHistory.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-4 text-center">
                      No exports yet
                    </p>
                  ) : (
                    <div className="divide-y">
                      {exportHistory.map((entry) => (
                        <div
                          key={entry._id}
                          className="px-3 py-2.5"
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              {entry.format === 'pdf' ? (
                                <FileText className="h-3 w-3 text-red-500" />
                              ) : (
                                <FileIcon className="h-3 w-3 text-blue-500" />
                              )}
                              <span className="text-xs font-medium uppercase">
                                {entry.format}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {entry.versionString}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {entry.exportedByName} - {formatDate(entry.exportedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Version Info */}
            <div className="text-center text-[11px] text-muted-foreground pt-2">
              Exporting version <span className="font-mono font-medium">{versionString || 'v1.0'}</span>
            </div>
          </div>
        </Modal>
      </>
    )
  }
)

ExportDropdown.displayName = "ExportDropdown"
export default ExportDropdown
