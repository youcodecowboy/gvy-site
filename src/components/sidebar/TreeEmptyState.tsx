'use client'

import { FileText, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui'

interface TreeEmptyStateProps {
  onNewDoc?: () => void
  onNewFolder?: () => void
}

export function TreeEmptyState({ onNewDoc, onNewFolder }: TreeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium text-foreground mb-1">No documents yet</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Get started by creating your first document
      </p>
      <div className="flex flex-col gap-2 w-full">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={onNewDoc}
          leftIcon={<FileText className="h-3.5 w-3.5" />}
        >
          Create your first doc
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onNewFolder}
          leftIcon={<FolderPlus className="h-3.5 w-3.5" />}
        >
          Create folder
        </Button>
      </div>
    </div>
  )
}
