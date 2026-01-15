'use client'

import { useEffect, useCallback, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  FileText, 
  FolderPlus, 
  Search, 
  Settings, 
  X, 
  ChevronDown, 
  ChevronRight, 
  PanelLeftClose, 
  PanelLeft,
  User as UserIcon,
  Building2,
  Plus,
} from 'lucide-react'
import { IconButton, Divider, SidebarTreeSkeleton } from '@/components/ui'
import { SidebarTree } from '@/components/sidebar'
import { useSidebar } from './SidebarContext'
import { useNavigation } from './NavigationContext'
import { useCommandPalette } from '@/components/CommandPalette'
import { useToast } from '@/components/ui'
import { usePersonalNodes, useOrganizationNodes, useCreateNode, useUpdateTitle, useRemoveNode, useMoveNode, useReorderNode } from '@/hooks/useNodes'
import { useOrganization, useUser, OrganizationSwitcher } from '@clerk/nextjs'
import { OrganizationSettingsModal } from '@/components/organization'
import { useTheme } from 'next-themes'
import type { Id } from '../../../convex/_generated/dataModel'

export function Sidebar() {
  const router = useRouter()
  const { isOpen, close, isCollapsed, toggleCollapse } = useSidebar()
  const { currentSection, currentFolderId, setCurrentSection } = useNavigation()
  const { open: openCommandPalette } = useCommandPalette()
  const { toast } = useToast()
  const { organization } = useOrganization()
  const { user } = useUser()
  const { resolvedTheme } = useTheme()
  
  // Section expand states
  const [personalExpanded, setPersonalExpanded] = useState(true)
  const [orgExpanded, setOrgExpanded] = useState(true)
  
  // Organization settings modal state
  const [isOrgSettingsOpen, setIsOrgSettingsOpen] = useState(false)
  
  // Convex data
  const personalNodes = usePersonalNodes()
  const orgNodes = useOrganizationNodes(organization?.id)
  const createNode = useCreateNode()
  const updateTitle = useUpdateTitle()
  const removeNode = useRemoveNode()
  const moveNode = useMoveNode()
  const reorderNode = useReorderNode()

  // Track current path for folder context
  const pathname = usePathname()
  
  // Update navigation context based on current path
  useEffect(() => {
    if (pathname.includes('/folder/')) {
      const folderId = pathname.split('/folder/')[1]
      // Check if this folder is in org or personal
      const isOrgFolder = orgNodes.some(n => n._id === folderId)
      if (isOrgFolder) {
        setCurrentSection('organization')
      }
    }
  }, [pathname, orgNodes, setCurrentSection])

  // Close sidebar on ESC key (mobile)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  const handleRename = useCallback(async (id: string, newTitle: string) => {
    try {
      await updateTitle({ id: id as Id<'nodes'>, title: newTitle })
      toast({ title: 'Renamed', variant: 'success' })
    } catch (error) {
      toast({ title: 'Failed to rename', variant: 'error' })
    }
  }, [updateTitle, toast])

  const handleNewDoc = useCallback(async () => {
    try {
      const isOrg = currentSection === 'organization' && organization?.id
      const newId = await createNode({
        type: 'doc',
        parentId: currentFolderId ? (currentFolderId as Id<'nodes'>) : null,
        title: 'Untitled',
        orgId: isOrg ? organization.id : undefined,
      })
      toast({ title: 'Document created', variant: 'success' })
      router.push(`/app/doc/${newId}`)
    } catch (error) {
      toast({ title: 'Failed to create document', variant: 'error' })
    }
  }, [createNode, toast, currentSection, currentFolderId, organization?.id, router])

  const handleNewFolder = useCallback(async () => {
    try {
      const isOrg = currentSection === 'organization' && organization?.id
      const newId = await createNode({
        type: 'folder',
        parentId: currentFolderId ? (currentFolderId as Id<'nodes'>) : null,
        title: 'New Folder',
        orgId: isOrg ? organization.id : undefined,
      })
      toast({ title: 'Folder created', variant: 'success' })
      router.push(`/app/folder/${newId}`)
    } catch (error) {
      toast({ title: 'Failed to create folder', variant: 'error' })
    }
  }, [createNode, toast, currentSection, currentFolderId, organization?.id, router])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await removeNode({ id: id as Id<'nodes'> })
      toast({ title: 'Deleted', variant: 'success' })
    } catch (error) {
      toast({ title: 'Failed to delete', variant: 'error' })
    }
  }, [removeNode, toast])

  const handleMove = useCallback(async (id: string, newParentId: string | null) => {
    try {
      await moveNode({
        id: id as Id<'nodes'>,
        newParentId: newParentId ? (newParentId as Id<'nodes'>) : null,
      })
      toast({ title: 'Moved', variant: 'success' })
    } catch (error) {
      toast({ title: 'Failed to move', variant: 'error' })
    }
  }, [moveNode, toast])

  const handleReorder = useCallback(async (id: string, newParentId: string | null, newOrder: number) => {
    try {
      await reorderNode({
        id: id as Id<'nodes'>,
        newParentId: newParentId ? (newParentId as Id<'nodes'>) : null,
        newOrder,
      })
    } catch (error) {
      toast({ title: 'Failed to move', variant: 'error' })
    }
  }, [reorderNode, toast])

  // Convert nodes to the format expected by SidebarTree
  const convertNodes = (nodes: typeof personalNodes) => nodes.map((node) => ({
    id: node._id,
    type: node.type,
    parentId: node.parentId,
    title: node.title,
    icon: node.icon,
    order: node.order,
    updatedAt: new Date(node._creationTime).toISOString(),
  }))

  const convertedPersonalNodes = convertNodes(personalNodes)
  const convertedOrgNodes = convertNodes(orgNodes)

  // Calculate stats
  const personalDocCount = personalNodes.filter(n => n.type === 'doc').length
  const orgDocCount = orgNodes.filter(n => n.type === 'doc').length
  const totalDocs = personalDocCount + orgDocCount

  // Collapsed view content
  const CollapsedContent = () => (
    <div className="flex flex-col items-center py-2 space-y-2">
      <Link href="/app" className="mb-1">
        <Image
          src="/groovy.png"
          alt="Home"
          width={32}
          height={32}
          className="h-8 w-8 hover:opacity-80 transition-opacity"
        />
      </Link>
      {user?.imageUrl && (
        <img 
          src={user.imageUrl} 
          alt="Profile" 
          className="w-8 h-8 rounded-full"
        />
      )}
      <Divider />
      <IconButton
        size="sm"
        onClick={handleNewDoc}
        tooltip="New Document"
      >
        <FileText className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="sm"
        onClick={handleNewFolder}
        tooltip="New Folder"
      >
        <FolderPlus className="h-4 w-4" />
      </IconButton>
      <Divider />
      <IconButton
        size="sm"
        onClick={openCommandPalette}
        tooltip="Search (⌘K)"
      >
        <Search className="h-4 w-4" />
      </IconButton>
      <IconButton
        size="sm"
        tooltip="Settings"
      >
        <Settings className="h-4 w-4" />
      </IconButton>
    </div>
  )

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-sidebar-border bg-sidebar
          transition-all duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[60px]' : 'w-[260px]'}
        `}
      >
        {/* Header with logo and collapse toggle */}
        <div className={`flex h-14 items-center justify-between ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {!isCollapsed ? (
            <>
              <Link href="/app" className="flex items-center hover:opacity-80 transition-opacity">
                <Image
                  src={resolvedTheme === 'dark' ? '/1.png' : '/2.png'}
                  alt="Logo"
                  width={242}
                  height={64}
                  className="h-[64px] w-auto"
                  priority
                />
              </Link>
              <div className="flex items-center gap-1">
                <IconButton
                  size="sm"
                  onClick={toggleCollapse}
                  className="hidden lg:flex"
                  tooltip="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </IconButton>
                <IconButton
                  size="sm"
                  onClick={close}
                  className="lg:hidden"
                  tooltip="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
            </>
          ) : (
            <IconButton
              size="sm"
              onClick={toggleCollapse}
              tooltip="Expand sidebar"
              className="mx-auto"
            >
              <PanelLeft className="h-4 w-4" />
            </IconButton>
          )}
        </div>

        <Divider />

        {isCollapsed ? (
          <CollapsedContent />
        ) : (
          <>
            {/* User Profile Section */}
            <div className="px-3 py-3">
              <div className="flex items-center gap-3">
                {user?.imageUrl ? (
                  <img 
                    src={user.imageUrl} 
                    alt="Profile" 
                    className="w-9 h-9 rounded-full shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {user?.fullName || user?.username || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}
                  </p>
                </div>
              </div>
            </div>

            <Divider />

            {/* Action Buttons */}
            <div className="px-3 py-2 flex gap-2">
              <button
                onClick={handleNewDoc}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Doc</span>
              </button>
              <button
                onClick={handleNewFolder}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md border border-input bg-background text-xs font-medium hover:bg-accent transition-colors"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>New Folder</span>
              </button>
            </div>

            <Divider />

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              {/* My Documents Section */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setPersonalExpanded(!personalExpanded)
                    setCurrentSection('personal')
                  }}
                  className={`
                    flex w-full items-center gap-2 px-3 py-2 text-sm
                    hover:bg-sidebar-accent transition-colors
                    ${currentSection === 'personal' ? 'text-foreground font-medium' : 'text-muted-foreground'}
                  `}
                >
                  {personalExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <UserIcon className="h-4 w-4 shrink-0" />
                  <span>My Documents</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {personalDocCount}
                  </span>
                </button>
                
                {personalExpanded && (
                  <div onClick={() => setCurrentSection('personal')}>
                    {personalNodes === undefined ? (
                      <SidebarTreeSkeleton />
                    ) : (
                      <SidebarTree
                        nodes={convertedPersonalNodes}
                        onRename={handleRename}
                        onNewDoc={(parentId) => {
                          createNode({
                            type: 'doc',
                            parentId: parentId ? (parentId as Id<'nodes'>) : null,
                            title: 'Untitled',
                          })
                        }}
                        onNewFolder={(parentId) => {
                          createNode({
                            type: 'folder',
                            parentId: parentId ? (parentId as Id<'nodes'>) : null,
                            title: 'New Folder',
                          })
                        }}
                        onDelete={handleDelete}
                        onMove={handleMove}
                        onReorder={handleReorder}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* My Organization Section */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setOrgExpanded(!orgExpanded)
                    if (organization) {
                      setCurrentSection('organization')
                    }
                  }}
                  className={`
                    flex w-full items-center gap-2 px-3 py-2 text-sm
                    hover:bg-sidebar-accent transition-colors
                    ${currentSection === 'organization' ? 'text-foreground font-medium' : 'text-muted-foreground'}
                  `}
                >
                  {orgExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{organization?.name || 'My Organization'}</span>
                  {organization && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {orgDocCount}
                    </span>
                  )}
                </button>
                
                {orgExpanded && (
                  <>
                    {organization ? (
                      <div onClick={() => setCurrentSection('organization')}>
                        {orgNodes === undefined ? (
                          <SidebarTreeSkeleton />
                        ) : (
                          <SidebarTree
                            nodes={convertedOrgNodes}
                            onRename={handleRename}
                            onNewDoc={(parentId) => {
                              createNode({
                                type: 'doc',
                                parentId: parentId ? (parentId as Id<'nodes'>) : null,
                                title: 'Untitled',
                                orgId: organization.id,
                              })
                            }}
                            onNewFolder={(parentId) => {
                              createNode({
                                type: 'folder',
                                parentId: parentId ? (parentId as Id<'nodes'>) : null,
                                title: 'New Folder',
                                orgId: organization.id,
                              })
                            }}
                            onDelete={handleDelete}
                            onMove={handleMove}
                            onReorder={handleReorder}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Create or join an organization to collaborate.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <Divider />

            {/* Footer */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={openCommandPalette}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
                <kbd className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>
              <button 
                onClick={() => setIsOrgSettingsOpen(true)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </div>
          </>
        )}
      </aside>
      
      {/* Organization Settings Modal */}
      <OrganizationSettingsModal 
        isOpen={isOrgSettingsOpen} 
        onClose={() => setIsOrgSettingsOpen(false)} 
      />
    </>
  )
}
