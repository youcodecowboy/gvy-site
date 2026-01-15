'use client'

import { Menu } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { IconButton } from '@/components/ui'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/components/notifications'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import { useSidebar } from './SidebarContext'

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[]
}

export function Header({ breadcrumbs = [] }: HeaderProps) {
  const { toggle } = useSidebar()

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <IconButton
          size="sm"
          onClick={toggle}
          className="lg:hidden"
          tooltip="Toggle sidebar"
        >
          <Menu className="h-4 w-4" />
        </IconButton>
        
        {breadcrumbs.length > 0 ? (
          <Breadcrumb items={breadcrumbs} />
        ) : (
          <span className="text-sm text-muted-foreground">Home</span>
        )}
      </div>

      {/* Center section - empty for now */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </header>
  )
}
