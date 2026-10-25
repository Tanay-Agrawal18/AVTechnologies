"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  FileSpreadsheet,
  BarChart3,
  LogOut,
  ShieldAlert,
  Mail,
  Award,
  FolderGit2,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Interns", href: "/admin/interns", icon: Users },
  { label: "Bulk Import", href: "/admin/import", icon: FileSpreadsheet },
  { label: "Tasks", href: "/admin/tasks", icon: CheckSquare },
  { label: "Review Queue", href: "/admin/review-queue", icon: Clock },
  { label: "Team Projects", href: "/admin/projects", icon: FolderGit2 },
  { label: "Bulk Email", href: "/admin/emails", icon: Mail },
  { label: "Offer Letters", href: "/admin/offer-letters", icon: FileSpreadsheet },
  { label: "Documents & Certs", href: "/admin/documents", icon: Award },
  { label: "Reports & KPIs", href: "/admin/reports", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    window.addEventListener("iwms:toggle-sidebar", handleToggle);
    return () => window.removeEventListener("iwms:toggle-sidebar", handleToggle);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <>
      {/* Mobile Toggle Button (Triggered via Header or fallback) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu"
        className="hidden"
        id="iwms-admin-menu-btn"
      />

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "w-64 min-h-screen flex flex-col iwms-sidebar fixed lg:static top-0 bottom-0 left-0 z-40 transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "var(--iwms-sidebar-bg)" }}
      >
        {/* Brand */}
        <div
          className="px-4 py-4 flex items-center justify-between gap-3"
          style={{ borderBottom: "1px solid var(--iwms-border)" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo mark */}
            <div className="h-9 w-9 rounded-xl flex items-center justify-center p-0.5 bg-white shadow-xs shrink-0 border border-slate-200 overflow-hidden">
              <img
                src="/image.png"
                alt="Vyorai"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1
                className="font-bold text-sm tracking-tight leading-none truncate"
                style={{ color: "var(--iwms-navy)" }}
              >
                Vyorai
              </h1>
              <span
                className="text-xs font-medium inline-flex items-center gap-1 mt-1 truncate"
                style={{ color: "var(--iwms-sky)" }}
              >
                <ShieldAlert className="w-3 h-3 shrink-0" /> Admin Portal
              </span>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-slate-100 shrink-0"
            style={{ color: "var(--iwms-navy)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive ? "" : "hover:bg-slate-50"
                )}
                style={
                  isActive
                    ? { background: "#E0F2FE", color: "#0284C7" }
                    : { color: "var(--iwms-navy)" }
                }
              >
                {/* Active left bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-md"
                    style={{ background: "#0284C7" }}
                  />
                )}
                <Icon
                  className="w-4 h-4 shrink-0"
                  style={
                    isActive
                      ? { color: "#0284C7" }
                      : { color: "var(--iwms-navy)", opacity: 0.7 }
                  }
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sign-out */}
        <div
          className="px-3 py-4"
          style={{ borderTop: "1px solid var(--iwms-border)" }}
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-50"
            style={{ color: "var(--iwms-navy)", opacity: 0.7 }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--iwms-navy)";
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
            }}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
