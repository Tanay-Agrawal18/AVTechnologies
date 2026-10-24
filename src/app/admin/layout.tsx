import { Suspense } from "react";
import { AdminSidebar } from "@/components/AdminSidebar";

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
        <Suspense fallback={<div className="p-4 sm:p-8" style={{ color: "var(--iwms-navy)" }}>Loading view...</div>}>
          {children}
        </Suspense>
      </div>
    </div>
  );
}
