'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileText,
} from 'lucide-react'
import { UploadingFile } from '@/hooks/useDocumentUpload'

export interface UploadProgressIndicatorProps {
  files: UploadingFile[]
  onCancel: (fileId: string) => void
  onRetry: (fileId: string) => void
  onDismiss: () => void
}

function FileStatusIcon({ status }: { status: UploadingFile['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'parsing':
    case 'creating':
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
  }
}

function FileStatusText({ status }: { status: UploadingFile['status'] }) {
  switch (status) {
    case 'pending':
      return 'Waiting...'
    case 'parsing':
      return 'Parsing...'
    case 'creating':
      return 'Creating document...'
    case 'success':
      return 'Complete'
    case 'error':
      return 'Failed'
  }
}

export function UploadProgressIndicator({
  files,
  onCancel,
  onRetry,
  onDismiss,
}: UploadProgressIndicatorProps) {
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted || files.length === 0) return null

  const activeFiles = files.filter(
    (f) => f.status === 'pending' || f.status === 'parsing' || f.status === 'creating'
  )
  const completedCount = files.filter((f) => f.status === 'success').length
  const errorCount = files.filter((f) => f.status === 'error').length
  const isComplete = activeFiles.length === 0

  const overallProgress = files.reduce((sum, f) => sum + f.progress, 0) / files.length

  const content = (
    <div className="fixed bottom-4 right-4 z-[200] w-80 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between border-b border-border bg-muted/50 px-4 py-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {!isComplete ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : errorCount > 0 ? (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="text-sm font-medium">
            {!isComplete
              ? `Uploading ${files.length} file${files.length > 1 ? 's' : ''}...`
              : errorCount > 0
                ? `${completedCount} uploaded, ${errorCount} failed`
                : `${completedCount} file${completedCount > 1 ? 's' : ''} uploaded`}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {!isComplete && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      {/* File list */}
      {isExpanded && (
        <div className="max-h-60 overflow-y-auto">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 border-b border-border/50 px-4 py-2 last:border-0"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{file.file.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileStatusText status={file.status} />
                  {file.error && (
                    <span className="text-red-500">- {file.error}</span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <FileStatusIcon status={file.status} />
                {file.status === 'error' && (
                  <button
                    onClick={() => onRetry(file.id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Retry"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
                {(file.status === 'pending' ||
                  file.status === 'parsing' ||
                  file.status === 'creating') && (
                  <button
                    onClick={() => onCancel(file.id)}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}
