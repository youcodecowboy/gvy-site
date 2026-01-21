'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation } from 'convex/react'
import { upload } from '@vercel/blob/client'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useToast } from '@/components/ui/ToastProvider'
import { htmlToTiptapJSON, ensureNonEmptyDoc } from '@/lib/html-to-tiptap'
import {
  isSupportedFile,
  MAX_FILE_SIZE,
  SUPPORTED_EXTENSIONS,
  getExtensionFromFilename,
} from '@/lib/document-parsers'

export type UploadStatus = 'pending' | 'uploading' | 'parsing' | 'creating' | 'success' | 'error'

export interface UploadingFile {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error?: string
  resultDocId?: string
}

export interface UseDocumentUploadOptions {
  folderId: Id<'nodes'> | null
  orgId?: string
  onSuccess?: (docIds: Id<'nodes'>[]) => void
  onError?: (error: Error, file: File) => void
  onComplete?: () => void
}

export interface UseDocumentUploadReturn {
  files: UploadingFile[]
  isUploading: boolean
  totalProgress: number
  uploadFiles: (files: FileList | File[]) => Promise<void>
  cancelUpload: (fileId: string) => void
  retryUpload: (fileId: string) => void
  clearCompleted: () => void
  clearAll: () => void
}

let fileIdCounter = 0

export function useDocumentUpload(
  options: UseDocumentUploadOptions
): UseDocumentUploadReturn {
  const { folderId, orgId, onSuccess, onError, onComplete } = options

  const [files, setFiles] = useState<UploadingFile[]>([])
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const createWithContent = useMutation(api.nodes.createWithContent)
  const { toast } = useToast()

  const isUploading = files.some(
    (f) => f.status === 'pending' || f.status === 'uploading' || f.status === 'parsing' || f.status === 'creating'
  )

  const totalProgress = files.length
    ? files.reduce((sum, f) => sum + f.progress, 0) / files.length
    : 0

  const updateFile = useCallback(
    (id: string, updates: Partial<UploadingFile>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      )
    },
    []
  )

  const processFile = useCallback(
    async (uploadingFile: UploadingFile) => {
      const { id, file } = uploadingFile
      const abortController = new AbortController()
      abortControllersRef.current.set(id, abortController)

      try {
        // Validate file
        if (!isSupportedFile(file.name, file.type)) {
          throw new Error(
            `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`
          )
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error(
            `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
          )
        }

        // Check for legacy .doc files
        const ext = getExtensionFromFilename(file.name)
        if (ext === '.doc') {
          throw new Error(
            'Legacy .doc format is not supported. Please convert to .docx using Microsoft Word or Google Docs.'
          )
        }

        // Step 1: Upload to blob storage
        updateFile(id, { status: 'uploading', progress: 10 })

        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/blob',
        })

        updateFile(id, { progress: 40 })

        // Step 2: Parse file via blob URL
        updateFile(id, { status: 'parsing', progress: 50 })

        const response = await fetch('/api/upload/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: blob.url,
            filename: file.name,
            size: file.size,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to parse file')
        }

        const { html, metadata } = await response.json()
        updateFile(id, { progress: 70 })

        // Step 3: Convert HTML to TipTap JSON
        const tiptapContent = htmlToTiptapJSON(html)
        const validContent = ensureNonEmptyDoc(tiptapContent)
        updateFile(id, { progress: 85 })

        // Step 4: Create document with content
        updateFile(id, { status: 'creating', progress: 90 })

        const docId = await createWithContent({
          parentId: folderId,
          title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
          content: validContent,
          orgId,
          sourceFile: {
            name: file.name,
            type: metadata.fileType || ext || 'unknown',
            size: file.size,
          },
        })

        updateFile(id, {
          status: 'success',
          progress: 100,
          resultDocId: docId,
        })

        return docId
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          updateFile(id, { status: 'error', error: 'Upload cancelled' })
          return null
        }

        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed'
        updateFile(id, { status: 'error', error: errorMessage })
        onError?.(error instanceof Error ? error : new Error(errorMessage), file)
        return null
      } finally {
        abortControllersRef.current.delete(id)
      }
    },
    [folderId, orgId, createWithContent, updateFile, onError]
  )

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const filesArray = Array.from(fileList)

      if (filesArray.length === 0) return

      // Create upload entries
      const newFiles: UploadingFile[] = filesArray.map((file) => ({
        id: `upload-${++fileIdCounter}`,
        file,
        status: 'pending' as UploadStatus,
        progress: 0,
      }))

      setFiles((prev) => [...prev, ...newFiles])

      // Process files sequentially to avoid overwhelming the server
      const successfulDocIds: Id<'nodes'>[] = []

      for (const uploadingFile of newFiles) {
        const docId = await processFile(uploadingFile)
        if (docId) {
          successfulDocIds.push(docId)
        }
      }

      // Show summary toast
      const successCount = successfulDocIds.length
      const failCount = filesArray.length - successCount

      if (successCount > 0 && failCount === 0) {
        toast({
          title:
            successCount === 1
              ? 'Document uploaded successfully'
              : `${successCount} documents uploaded successfully`,
          variant: 'success',
        })
      } else if (successCount > 0 && failCount > 0) {
        toast({
          title: `${successCount} of ${filesArray.length} documents uploaded`,
          description: `${failCount} failed. Check individual files for details.`,
          variant: 'info',
        })
      } else if (failCount > 0) {
        toast({
          title: 'Upload failed',
          description:
            failCount === 1
              ? 'Could not upload the document'
              : `Could not upload ${failCount} documents`,
          variant: 'error',
        })
      }

      if (successfulDocIds.length > 0) {
        onSuccess?.(successfulDocIds)
      }

      onComplete?.()
    },
    [processFile, toast, onSuccess, onComplete]
  )

  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId)
    if (controller) {
      controller.abort()
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const retryUpload = useCallback(
    async (fileId: string) => {
      const file = files.find((f) => f.id === fileId)
      if (!file || file.status !== 'error') return

      updateFile(fileId, { status: 'pending', progress: 0, error: undefined })
      await processFile(file)
    },
    [files, updateFile, processFile]
  )

  const clearCompleted = useCallback(() => {
    setFiles((prev) =>
      prev.filter((f) => f.status !== 'success' && f.status !== 'error')
    )
  }, [])

  const clearAll = useCallback(() => {
    // Cancel any ongoing uploads
    abortControllersRef.current.forEach((controller) => controller.abort())
    abortControllersRef.current.clear()
    setFiles([])
  }, [])

  return {
    files,
    isUploading,
    totalProgress,
    uploadFiles,
    cancelUpload,
    retryUpload,
    clearCompleted,
    clearAll,
  }
}
