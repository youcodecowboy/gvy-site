'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { isSupportedFile } from '@/lib/document-parsers'
import { UploadProgressIndicator } from './UploadProgressIndicator'

export interface FolderDropZoneProps {
  folderId: Id<'nodes'>
  orgId?: string
  children: React.ReactNode
  onUploadStart?: () => void
  onUploadComplete?: (docIds: Id<'nodes'>[]) => void
  className?: string
}

export function FolderDropZone({
  folderId,
  orgId,
  children,
  onUploadStart,
  onUploadComplete,
  className = '',
}: FolderDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const dragCounterRef = useRef(0)

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
    onSuccess: onUploadComplete,
    onComplete: () => {
      // Keep progress visible briefly after completion
      setTimeout(() => {
        if (!isUploading) {
          clearCompleted()
          setShowProgress(false)
        }
      }, 3000)
    },
  })

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++

    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--

    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      const droppedFiles = Array.from(e.dataTransfer.files)
      const supportedFiles = droppedFiles.filter((file) =>
        isSupportedFile(file.name, file.type)
      )

      if (supportedFiles.length === 0) {
        return
      }

      onUploadStart?.()
      setShowProgress(true)
      await uploadFiles(supportedFiles)
    },
    [uploadFiles, onUploadStart]
  )

  // Reset drag counter on mount/unmount
  useEffect(() => {
    return () => {
      dragCounterRef.current = 0
    }
  }, [])

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}

      {/* Drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-blue-500/20 p-4">
              <Upload className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                Drop files to upload
              </p>
              <p className="text-sm text-muted-foreground">
                Supported: .docx, .md, .txt, .pdf
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress indicator */}
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
    </div>
  )
}
