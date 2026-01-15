'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { IconButton } from '@/components/ui'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <IconButton size="sm" aria-label="Toggle theme">
        <Sun className="h-4 w-4" />
      </IconButton>
    )
  }

  // Use resolvedTheme to get actual theme (handles 'system' correctly)
  const isDark = resolvedTheme === 'dark'

  return (
    <IconButton
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
      tooltip={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </IconButton>
  )
}
