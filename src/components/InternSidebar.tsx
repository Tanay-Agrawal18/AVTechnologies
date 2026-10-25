"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  CheckSquare,
  Clock,
  User,
  LogOut,
  FolderGit2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/intern/dashboard", icon: Home },
  { label: "My Tasks", href: "/intern/tasks", icon: CheckSquare },
  { label: "Team Projects", href: "/intern/projects", icon: FolderGit2 },
  { label: "Work History", href: "/intern/history", icon: Clock },
  { label: "My Profile", href: "/intern/profile", icon: User },
];

export function InternSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Listen for sidebar toggle event from header and Escape key
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("iwms:toggle-sidebar", handleToggle);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("iwms:toggle-sidebar", handleToggle);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close sidebar on route change
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
      {/* Mobile hamburger — trigger navigation */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        className="hidden" // Handled by header event
        id="iwms-intern-menu-btn"
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
          className="px-4 py-4 flex items-center gap-3"
          style={{ borderBottom: "1px solid var(--iwms-border)" }}
        >
          {/* Logo mark */}
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center p-0.5 bg-white shadow-xs flex-shrink-0 border border-slate-200 overflow-hidden"
          >
            <img
              src="/image.png"
              alt="Vyorai"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h1
              className="font-bold text-sm tracking-tight leading-none"
              style={{ color: "var(--iwms-navy)" }}
            >
              Vyorai
            </h1>
            <span
              className="text-xs font-normal inline-flex items-center gap-1 mt-1"
              style={{ color: "rgba(11,31,58,0.50)" }}
            >
              Intern Workspace
            </span>
          </div>

          {/* Close button — right side, mobile only */}
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden ml-auto p-1.5 rounded-lg transition-colors hover:bg-slate-100 flex-shrink-0"
            style={{ color: "var(--iwms-navy)" }}
          >
            <X className="w-4 h-4" />
          </button>
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
              onClick={() => setIsOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? ""
                  : "hover:bg-slate-50"
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
                className="w-4 h-4 flex-shrink-0"
                style={isActive ? { color: "#0284C7" } : { color: "var(--iwms-navy)", opacity: 0.7 }}
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
    </>
  );
}
