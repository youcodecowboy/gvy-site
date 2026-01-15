import { Skeleton } from './Skeleton'

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-[250px]" />
      <Skeleton className="h-4 w-[180px]" />
    </div>
  )
}
