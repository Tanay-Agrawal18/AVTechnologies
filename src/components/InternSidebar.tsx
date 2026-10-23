"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  History,
  UserCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/intern/dashboard", icon: LayoutDashboard },
  { label: "My Tasks", href: "/intern/tasks", icon: CheckSquare },
  { label: "Work History", href: "/intern/history", icon: History },
  { label: "My Profile", href: "/intern/profile", icon: UserCircle },
];

export function InternSidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
    <aside
      className="w-64 min-h-screen flex flex-col iwms-sidebar"
      style={{ background: "var(--iwms-sidebar-bg)" }}
    >
      {/* Brand */}
      <div
        className="px-6 py-5 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--iwms-border)" }}
      >
        {/* Logo mark */}
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)" }}
        >
          IW
        </div>

        <div>
          <h1
            className="font-bold text-sm tracking-tight leading-none"
            style={{ color: "var(--iwms-navy)" }}
          >
            IWMS Portal
          </h1>
          <span
            className="text-xs font-medium inline-flex items-center gap-1 mt-0.5"
            style={{ color: "var(--iwms-sky)" }}
          >
            <Sparkles className="w-3 h-3" />
            Intern Workspace
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/intern/dashboard" &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "text-sky-500"
                  : "hover:bg-sky-50"
              )}
              style={
                isActive
                  ? { background: "var(--iwms-active-bg)", color: "var(--iwms-sky)" }
                  : { color: "var(--iwms-navy)" }
              }
            >
              {/* Active left bar */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: "var(--iwms-sky)" }}
                />
              )}
              <Icon
                className="w-4 h-4 flex-shrink-0"
                style={isActive ? { color: "var(--iwms-sky)" } : { color: "var(--iwms-navy)", opacity: 0.6 }}
              />
              {item.label}
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
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
