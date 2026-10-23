import { Suspense } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Suspense fallback={<div className="w-64 bg-slate-900 min-h-screen" />}>
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Suspense fallback={<div className="p-8 text-slate-500">Loading view...</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
