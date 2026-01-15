import { Skeleton } from './Skeleton'

export function EditorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title area */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>

      {/* Editor content area */}
      <div className="border border-border rounded-lg p-6 min-h-[400px] space-y-4">
        <Skeleton className="h-5 w-full max-w-[90%]" />
        <Skeleton className="h-5 w-full max-w-[75%]" />
        <Skeleton className="h-5 w-full max-w-[85%]" />
        <Skeleton className="h-5 w-full max-w-[60%]" />
        <div className="h-4" />
        <Skeleton className="h-5 w-full max-w-[80%]" />
        <Skeleton className="h-5 w-full max-w-[70%]" />
        <Skeleton className="h-5 w-full max-w-[90%]" />
      </div>
    </div>
  )
}
