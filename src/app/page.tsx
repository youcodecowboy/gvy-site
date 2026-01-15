import Link from 'next/link'
import Image from 'next/image'
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs'
import { Sparkles, PenTool, FileText, Users } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      {/* Main card */}
      <div className="w-full max-w-xl">
        {/* Logo box */}
        <div className="border-2 border-black rounded-lg p-5 mb-4 flex justify-center">
          <Image
            src="/2.png"
            alt="Groovy Docs"
            width={200}
            height={54}
            priority
            className="select-none"
          />
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border-2 border-black rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">ChatGPT5 Enabled</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              AI-powered writing assistance built directly into your editor. Generate, refine, and expand your ideas.
            </p>
          </div>
          <div className="border-2 border-black rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <PenTool className="h-4 w-4" />
              <span className="text-sm font-semibold">Eraser.io Integration</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Embed diagrams and whiteboards seamlessly. Visualize architecture and workflows alongside your docs.
            </p>
          </div>
          <div className="border-2 border-black rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4" />
              <span className="text-sm font-semibold">Notion-Style Editor</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Block-based editing with slash commands. Drag, drop, and organize content the way you think.
            </p>
          </div>
          <div className="border-2 border-black rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-semibold">Collaborative Live Docs</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Real-time editing with your team. See cursors, comments, and changes as they happen.
            </p>
          </div>
        </div>

        {/* Auth box */}
        <div className="border-2 border-black rounded-lg p-6">
          <SignedOut>
            <p className="text-sm text-gray-600 text-center mb-5">
              A minimal, fast documentation tool for teams who value simplicity and beautiful writing.
            </p>
            <div className="flex gap-3">
              <SignInButton mode="modal">
                <button className="flex-1 px-6 py-3 text-sm font-medium text-black bg-white border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="flex-1 px-6 py-3 text-sm font-medium text-black bg-white border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
                  Get Started
                </button>
              </SignUpButton>
            </div>
          </SignedOut>

          <SignedIn>
            <p className="text-sm text-gray-600 text-center mb-5">
              Welcome back. Your docs are waiting for you.
            </p>
            <Link href="/app" className="block">
              <button className="w-full px-6 py-3 text-sm font-medium text-black bg-white border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
                Open App
              </button>
            </Link>
          </SignedIn>
        </div>
      </div>

      {/* Version badge */}
      <div className="mt-8">
        <span className="text-xs text-gray-400 font-mono tracking-wide">
          v0.01 · alpha
        </span>
      </div>
    </div>
  )
}
