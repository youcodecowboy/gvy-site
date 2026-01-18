'use client'

import { useRef, useCallback, useState } from 'react'
import { Upload } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { SUPPORTED_EXTENSIONS } from '@/lib/document-parsers'
import { UploadProgressIndicator } from './UploadProgressIndicator'

export interface DocumentUploadButtonProps {
  folderId: Id<'nodes'> | null
  orgId?: string
  variant?: 'button' | 'icon' | 'menu-item'
  onComplete?: () => void
  className?: string
}

export function DocumentUploadButton({
  folderId,
  orgId,
  variant = 'button',
  onComplete,
  className = '',
}: DocumentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [showProgress, setShowProgress] = useState(false)

  const {
    files,
    isUploading,
    uploadFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
  } = useDocumentUpload({
    folderId,
    orgId,
    onComplete: () => {
      onComplete?.()
      // Keep progress visible briefly after completion
      setTimeout(() => {
        if (!isUploading) {
          clearCompleted()
          setShowProgress(false)
        }
      }, 3000)
    },
  })

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        setShowProgress(true)
        await uploadFiles(selectedFiles)
      }
      // Reset input so the same file can be selected again
      e.target.value = ''
    },
    [uploadFiles]
  )

  const acceptedTypes = SUPPORTED_EXTENSIONS.map((ext) =>
    ext === '.md' ? '.md,text/markdown' : ext
  ).join(',')

  const renderButton = () => {
    switch (variant) {
      case 'icon':
        return (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className={`flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${className}`}
            title="Upload documents"
          >
            <Upload className="h-5 w-5" />
          </button>
        )

      case 'menu-item':
        return (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50 ${className}`}
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            Upload to folder
          </button>
        )

      case 'button':
      default:
        return (
          <button
            onClick={handleClick}
            disabled={isUploading}
            className={`inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 ${className}`}
          >
            <Upload className="h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        )
    }
  }

  return (
    <>
      {renderButton()}
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes}
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      {showProgress && files.length > 0 && (
        <UploadProgressIndicator
          files={files}
          onCancel={cancelUpload}
          onRetry={retryUpload}
          onDismiss={() => {
            clearCompleted()
            setShowProgress(false)
          }}
        />
      )}
    </>
  )
}
