import { Skeleton } from './Skeleton'

export function SidebarTreeSkeleton() {
  return (
    <div className="py-2 px-2 space-y-1">
      {/* Root level items */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-3.5 w-3.5" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[140px]" />
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-3.5 w-3.5" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[100px]" />
      </div>
      
      {/* Nested items (indented) */}
      <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: '20px' }}>
        <div className="w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[160px]" />
      </div>
      <div className="flex items-center gap-2 py-1.5" style={{ paddingLeft: '20px' }}>
        <div className="w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[120px]" />
      </div>
      
      {/* More root items */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-3.5 w-3.5" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[80px]" />
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[130px]" />
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-4" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 flex-1 max-w-[150px]" />
      </div>
    </div>
  )
}
