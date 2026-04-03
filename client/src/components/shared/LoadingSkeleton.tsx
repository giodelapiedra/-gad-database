import { Skeleton } from '@/components/ui/skeleton';

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <Skeleton className="mb-3 size-8 rounded-lg" />
      <Skeleton className="mb-1.5 h-7 w-20" />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-2">
          <Skeleton
            className={
              i === 0
                ? 'h-4 w-8'
                : i === columns - 1
                  ? 'ml-auto h-4 w-16'
                  : 'h-4 w-24'
            }
          />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton() {
  return <Skeleton className="h-[200px] w-full rounded-xl" />;
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

export function SidebarItemSkeleton() {
  return <Skeleton className="mx-2.5 h-8 rounded-md" />;
}
