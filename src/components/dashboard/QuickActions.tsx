'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Folder } from 'lucide-react'
import { useMutation } from 'convex/react'
import { useOrganization } from '@clerk/nextjs'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui'

export function QuickActions() {
  const router = useRouter()
  const { organization } = useOrganization()
  const createNode = useMutation(api.nodes.create)
  const { toast } = useToast()

  const handleCreateDoc = useCallback(async () => {
    try {
      const newDocId = await createNode({
        type: 'doc',
        parentId: null,
        title: 'Untitled',
        orgId: organization?.id,
      })
      toast({ title: 'Document created', variant: 'success' })
      router.push(`/app/doc/${newDocId}`)
    } catch (error) {
      toast({ title: 'Failed to create document', variant: 'error' })
    }
  }, [createNode, organization?.id, router, toast])

  const handleCreateFolder = useCallback(async () => {
    try {
      const newFolderId = await createNode({
        type: 'folder',
        parentId: null,
        title: 'New Folder',
        orgId: organization?.id,
      })
      toast({ title: 'Folder created', variant: 'success' })
      router.push(`/app/folder/${newFolderId}`)
    } catch (error) {
      toast({ title: 'Failed to create folder', variant: 'error' })
    }
  }, [createNode, organization?.id, router, toast])

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        onClick={handleCreateDoc}
        leftIcon={<FileText className="h-4 w-4" />}
      >
        <Plus className="h-3 w-3 mr-1" />
        New Document
      </Button>
      <Button
        variant="secondary"
        onClick={handleCreateFolder}
        leftIcon={<Folder className="h-4 w-4" />}
      >
        <Plus className="h-3 w-3 mr-1" />
        New Folder
      </Button>
    </div>
  )
}
