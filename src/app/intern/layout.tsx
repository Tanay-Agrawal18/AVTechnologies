import { Suspense } from "react";
import { InternSidebar } from "@/components/InternSidebar";
import { InternSessionGuard } from "@/components/InternSessionGuard";

import { Skeleton } from "@/components/Skeleton";

export const dynamic = "force-dynamic";

export default function InternLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--iwms-bg)" }}>
      {/* Real-time session revocation listener */}
      <InternSessionGuard />



      {/* Sidebar */}
      <Suspense
        fallback={
          <div className="w-64 h-screen bg-white border-r" style={{ borderColor: "var(--iwms-border)" }} />
        }
      >
        <InternSidebar />
      </Suspense>

      {/* Main workspace — receives the wave pseudo-elements */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto iwms-workspace">
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
