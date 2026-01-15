'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'
import { EmptyState, Button, Skeleton } from '@/components/ui'
import { TipTapEditor, DocHeader } from '@/components/editor'

export default function DocPage() {
  const params = useParams()
  const id = params.id as string
  const doc = useQuery(api.nodes.get, { id: id as Id<'nodes'> })
  const [isSaving, setIsSaving] = useState(false)

  // Loading state
  if (doc === undefined) {
    return (
      <div className="min-h-full">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb skeleton */}
          <Skeleton className="h-4 w-48 mb-4" />
          
          {/* Title skeleton */}
          <div className="flex items-start gap-3 mb-4">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-10 w-96" />
          </div>
          
          {/* Properties skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-28" />
          </div>
          
          {/* Editor skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    )
  }

  // Not found state
  if (!doc || doc.type !== 'doc') {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="Document not found"
          description="This document doesn't exist or has been deleted."
          actions={
            <Link href="/app">
              <Button variant="secondary">Go back home</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <div className="w-full max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DocHeader
          doc={{
            _id: doc._id,
            title: doc.title,
            parentId: doc.parentId,
            icon: doc.icon,
            tags: doc.tags,
            status: doc.status,
            ownerId: doc.ownerId,
            orgId: doc.orgId,
          }}
          isSaving={isSaving}
        />
        <TipTapEditor
          docId={doc._id}
          docTitle={doc.title}
          content={doc.content}
          onSavingChange={setIsSaving}
        />
      </div>
    </div>
  )
}
