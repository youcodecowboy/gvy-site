import Link from 'next/link'
import { FileText } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <FileText className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Groovy Docs</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          A minimal, fast documentation tool for teams who value simplicity.
        </p>
        
        <SignedOut>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <SignInButton mode="modal">
              <Button variant="secondary" size="md">
                Sign In
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="md">
                Get Started
              </Button>
            </SignUpButton>
          </div>
        </SignedOut>
        
        <SignedIn>
          <Link href="/app">
            <Button size="md">
              Open App
            </Button>
          </Link>
        </SignedIn>
      </div>
    </div>
  )
}
