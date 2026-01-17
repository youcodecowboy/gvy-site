'use client'

import { useEffect } from 'react'
import { FileText, FolderOpen, Plus, Clock, Users, Bell, MessageSquare, Flag } from 'lucide-react'
import { useQuery } from 'convex/react'
import { useOrganization } from '@clerk/nextjs'
import { api } from '../../../convex/_generated/api'
import { Skeleton } from '@/components/ui'
import { useNavigation } from '@/components/app-shell'
import {
  Greeting,
  MetricCard,
  QuickActions,
  RecentDocumentCard,
  RecentActivity,
  MentionsPreview,
  CommentsPreview,
  FlagsPreview,
  ThreadsPreview,
} from '@/components/dashboard'
import { usePrefetch } from '@/hooks/usePrefetch'

export default function AppPage() {
  const { organization } = useOrganization()
  const { setCurrentFolderId } = useNavigation()
  const { prefetchDoc, prefetchDocs } = usePrefetch()

  // Get dashboard data
  const dashboardData = useQuery(api.dashboard.getHomePageData, {
    orgId: organization?.id,
  })

  // Reset folder context when on home page
  useEffect(() => {
    setCurrentFolderId(null)
  }, [setCurrentFolderId])

  // Prefetch recent documents for faster navigation
  useEffect(() => {
    if (dashboardData) {
      const docsToPrefetch: string[] = []

      // Prefetch most recent document (it's always a doc from dashboard)
      if (dashboardData.mostRecentDocument) {
        docsToPrefetch.push(dashboardData.mostRecentDocument._id)
      }

      // Prefetch first 5 documents from recent updates
      const recentDocs = dashboardData.recentUpdates
        .filter((update: any) => !update.isDeleted)
        .slice(0, 5)
        .map((update: any) => update._id)

      docsToPrefetch.push(...recentDocs)

      if (docsToPrefetch.length > 0) {
        prefetchDocs(docsToPrefetch)
      }
    }
  }, [dashboardData, prefetchDocs])

  // Loading state
  if (dashboardData === undefined) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        {/* Greeting skeleton */}
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Quick actions skeleton */}
        <div className="mb-8 flex gap-3">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  // No data state (user not authenticated)
  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Welcome to Groovy Docs</h2>
          <p className="text-muted-foreground">Please sign in to continue</p>
        </div>
      </div>
    )
  }

  const {
    userName,
    totalDocuments,
    totalFolders,
    documentsAddedLast24h,
    mostRecentDocument,
    recentTeamUpdates,
    recentUpdates,
    unreadMentions,
    unreadMentionCount,
    recentComments,
    unreadFlags,
    unreadFlagCount,
    recentThreads,
    unreadThreadNotificationCount,
    hasOrgAccess,
  } = dashboardData

  // Empty state - no documents yet
  if (totalDocuments === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Greeting userName={userName} />
        
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No documents yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Create your first document to get started with Groovy Docs. 
              Collaborate with your team and keep everything organized.
            </p>
            <QuickActions />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Greeting */}
      <Greeting userName={userName} />

      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Documents"
          value={totalDocuments}
          icon={<FileText className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          label="Folders"
          value={totalFolders}
          icon={<FolderOpen className="h-5 w-5 text-primary" />}
        />
        <MetricCard
          label="Added Today"
          value={documentsAddedLast24h}
          icon={<Plus className="h-5 w-5 text-primary" />}
          description="Last 24 hours"
        />
        <MetricCard
          label={hasOrgAccess ? "Team Updates" : "Unread Mentions"}
          value={hasOrgAccess ? recentTeamUpdates.length : unreadMentionCount}
          icon={hasOrgAccess ? <Users className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5 text-primary" />}
          description={hasOrgAccess ? "Recent team activity" : "Notifications"}
        />
      </div>

      {/* Most Recent Document */}
      {mostRecentDocument && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Most Recently Updated
          </h2>
          <RecentDocumentCard document={mostRecentDocument} />
        </section>
      )}

      {/* Mentions, Flags, Comments & Threads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MentionsPreview mentions={unreadMentions} title="Recent Mentions" />
        <FlagsPreview flags={unreadFlags || []} unreadCount={unreadFlagCount || 0} />
        <CommentsPreview comments={recentComments} title="Recent Comments" />
        <ThreadsPreview threads={recentThreads || []} unreadCount={unreadThreadNotificationCount || 0} />
      </div>

      {/* Recent Activity */}
      {recentUpdates.length > 0 && (
        <section className="mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <RecentActivity
              activities={recentUpdates}
              title="Recent Activity"
              emptyMessage="No recent activity"
            />
          </div>
        </section>
      )}

      {/* Team Updates (if in org) */}
      {hasOrgAccess && recentTeamUpdates.length > 0 && (
        <section>
          <div className="bg-card border border-border rounded-lg p-4">
            <RecentActivity
              activities={recentTeamUpdates}
              title="Team Updates"
              emptyMessage="No team activity yet"
            />
          </div>
        </section>
      )}
    </div>
  )
}
