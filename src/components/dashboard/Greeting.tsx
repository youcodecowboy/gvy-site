'use client'

import { useMemo } from 'react'

interface GreetingProps {
  userName: string
}

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  } else if (hour >= 12 && hour < 18) {
    return 'Good afternoon'
  } else {
    return 'Good evening'
  }
}

export function Greeting({ userName }: GreetingProps) {
  const greeting = useMemo(() => getTimeBasedGreeting(), [])
  
  // Get first name only
  const firstName = userName.split(' ')[0]

  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {greeting}, {firstName}
      </h1>
      <p className="text-muted-foreground mt-1">
        Here&apos;s what&apos;s happening with your documents
      </p>
    </div>
  )
}
