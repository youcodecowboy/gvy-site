'use client'

import { Sparkles } from 'lucide-react'

interface AskDiscoButtonProps {
  onClick: () => void
  isOpen?: boolean
}

export function AskDiscoButton({ onClick, isOpen }: AskDiscoButtonProps) {
  // Hide button when panel is open
  if (isOpen) return null

  return (
    <button
      onClick={onClick}
      className="
        ask-disco-button
        fixed bottom-6 right-6 z-50
        flex items-center gap-2
        px-4 py-2.5
        rounded-full
        font-medium text-sm
        shadow-lg
        transition-all duration-200
        bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-xl hover:scale-105
      "
      title="Ask Disco"
    >
      <Sparkles className="h-4 w-4 animate-pulse" />
      <span>Ask Disco</span>
    </button>
  )
}
