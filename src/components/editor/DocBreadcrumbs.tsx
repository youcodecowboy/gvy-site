'use client'

import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  id: string
  title: string
  type: 'folder' | 'doc'
}

interface DocBreadcrumbsProps {
  path: BreadcrumbItem[]
}

export function DocBreadcrumbs({ path }: DocBreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/app"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      
      {path.map((item, index) => {
        const isLast = index === path.length - 1
        const href = item.type === 'folder'
          ? `/app/folder/${item.id}`
          : `/app/doc/${item.id}`

        return (
          <div key={item.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[200px]">
                {item.title}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors truncate max-w-[150px]"
              >
                {item.title}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
