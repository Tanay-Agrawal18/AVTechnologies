import { Suspense } from "react";
import { InternSidebar } from "@/components/InternSidebar";

export const dynamic = "force-dynamic";

export default function InternLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={<div className="w-64 bg-slate-900 min-h-screen" />}>
        <InternSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Suspense fallback={<div className="p-8 text-slate-500">Loading workspace...</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
