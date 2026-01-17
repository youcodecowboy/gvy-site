'use client'

import { Calendar, User, FolderOpen } from 'lucide-react'

interface FolderMetadataProps {
  folder: {
    _creationTime: number
    updatedAt?: number
    updatedByName?: string
  }
}

export function FolderMetadata({ folder }: FolderMetadataProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Folder Information</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>Created {formatDate(folder._creationTime)}</span>
        </div>

        {folder.updatedByName && folder.updatedAt && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span>
              Last updated by {folder.updatedByName} on {formatDate(folder.updatedAt)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
