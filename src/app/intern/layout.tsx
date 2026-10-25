import { Suspense } from "react";
import { InternSidebar } from "@/components/InternSidebar";
import { InternSessionGuard } from "@/components/InternSessionGuard";

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
            <div className="p-8" style={{ color: "var(--iwms-navy)" }}>
              Loading workspace…
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}
