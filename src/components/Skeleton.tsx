import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-700/50 ${className}`}
      {...props}
    />
  );
}

export function KpiCardSkeleton() {
  return (
    <div
      className="iwms-card p-3 sm:p-5 flex flex-col justify-between"
      style={{ borderRadius: "12px" }}
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      </div>
      <div className="my-2 sm:my-3">
        <Skeleton className="h-7 sm:h-9 w-16" />
      </div>
      <Skeleton className="h-3 w-32 mt-1" />
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div
      className="iwms-card p-4 sm:p-5 flex flex-col justify-between space-y-4"
      style={{ borderRadius: "12px" }}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-5/6" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3.5 px-4">
          <Skeleton
            className={`h-4 ${
              i === 0 ? "w-36" : i === columns - 1 ? "w-16 ml-auto" : "w-24"
            }`}
          />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} columns={columns} />
      ))}
    </>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div
      className="iwms-card p-4 sm:p-5 space-y-4"
      style={{ borderRadius: "12px" }}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex -space-x-2">
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-full" />
          <Skeleton className="w-7 h-7 rounded-full" />
        </div>
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
