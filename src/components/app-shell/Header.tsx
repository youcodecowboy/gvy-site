'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { useTheme } from 'next-themes'
import { IconButton } from '@/components/ui'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NotificationBell } from '@/components/notifications'
import { OnlineUsersIndicator } from '@/components/presence'
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'
import { useSidebar } from './SidebarContext'

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[]
}

export function Header({ breadcrumbs = [] }: HeaderProps) {
  const { toggle, isCollapsed } = useSidebar()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine logo source - only use theme after mounted to avoid hydration mismatch
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/1.png' : '/2.png'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Show logo in header when sidebar is collapsed */}
        {isCollapsed && (
          <Link href="/app" className="hidden lg:flex items-center hover:opacity-80 transition-opacity">
            <Image
              src={logoSrc}
              alt="Logo"
              width={242}
              height={64}
              className="h-[40px] w-auto"
              priority
            />
          </Link>
        )}
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
        <OnlineUsersIndicator />
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
