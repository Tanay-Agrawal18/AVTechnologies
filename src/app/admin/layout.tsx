import { Suspense } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Skeleton } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--iwms-bg)" }}>
      <Suspense fallback={<div className="hidden lg:block w-64 h-screen bg-white border-r" style={{ borderColor: "var(--iwms-border)" }} />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full iwms-workspace">
        <Suspense
          fallback={
            <div className="p-4 sm:p-8 space-y-6">
              <div className="space-y-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}
