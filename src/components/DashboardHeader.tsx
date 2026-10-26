"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Menu,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckCheck,
  RotateCcw,
  RefreshCw,
  X,
  Inbox,
} from "lucide-react";
import { SessionUser, INotification } from "@/types";
import { Skeleton } from "@/components/Skeleton";

interface HeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function DashboardHeader({ title, description, action }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

  // Notification state
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setError("Failed to load notifications");
      }
    } catch {
      setError("Network error loading notifications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkAuth = () => {
      fetch("/api/auth/me")
        .then((res) => {
          if (res.status === 401 || res.status === 403) {
            window.location.href = "/login?error=inactive";
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then((data) => {
          if (isMounted && data?.user) setCurrentUser(data.user);
        })
        .catch(() => {});
    };

    checkAuth();
    fetchNotifications();

    const handleProfileUpdate = () => {
      checkAuth();
    };
    window.addEventListener("profile-picture-updated", handleProfileUpdate);

    // Periodic check every 20 seconds for notifications & auth status
    const interval = setInterval(() => {
      checkAuth();
      fetchNotifications();
    }, 20000);

    return () => {
      isMounted = false;
      window.removeEventListener("profile-picture-updated", handleProfileUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id, isRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const formatRelativeTime = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const triggerSidebar = () => {
    window.dispatchEvent(new CustomEvent("iwms:toggle-sidebar"));
  };

  const initials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "submission_approved":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "deadline_overdue":
        return (
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case "deadline_approaching":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-4 h-4" />
          </div>
        );
      case "submission_changes_requested":
        return (
          <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <RotateCcw className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <header
      suppressHydrationWarning
      className="sticky top-0 z-40 px-3.5 py-2.5 sm:px-6 sm:py-3.5 lg:px-8 lg:py-4 transition-all bg-white/95 backdrop-blur-md"
      style={{
        borderBottom: "1px solid var(--iwms-border)",
      }}
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-4 min-w-0">
        {/* Left: Mobile Menu Button + Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={triggerSidebar}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-xl transition-all duration-150 hover:bg-slate-100 active:scale-95 shrink-0 flex items-center justify-center text-slate-700 hover:text-slate-900"
            style={{
              border: "1px solid var(--iwms-border)",
              background: "rgba(248, 250, 252, 0.8)",
            }}
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
          </button>

          <div className="min-w-0 flex-1">
            <h1
              className="text-sm sm:text-lg lg:text-xl font-bold tracking-tight truncate leading-tight"
              style={{ color: "var(--iwms-navy)" }}
              title={title}
            >
              {title}
            </h1>
            {description && (
              <p
                className="hidden md:block text-[11px] lg:text-xs mt-0.5 truncate"
                style={{ color: "rgba(11,31,58,.50)" }}
                title={description}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions, Notifications & Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0" suppressHydrationWarning>
          {action && <div className="hidden sm:flex items-center gap-2 mr-1">{action}</div>}

          {/* Premium Notification Bell & Popover */}
          <div className="relative" ref={dropdownRef} suppressHydrationWarning>
            <button
              suppressHydrationWarning
              onClick={() => {
                setIsOpen(!isOpen);
                if (!isOpen) fetchNotifications();
              }}
              className={`relative h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 focus:outline-none focus:ring-2 focus:ring-sky-500/25 ${
                isOpen
                  ? "bg-sky-50 text-sky-700 ring-2 ring-sky-300/80 shadow-xs"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200/80 shadow-xs"
              }`}
              title="Notifications"
              aria-label="View notifications"
              aria-expanded={isOpen}
            >
              <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px] transition-transform group-hover:scale-105" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] sm:h-4.5 sm:min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs ring-2 ring-white animate-in zoom-in-75">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {isOpen && (
              <div
                className="absolute right-0 top-full mt-2.5 w-[330px] sm:w-[380px] max-w-[calc(100vw-24px)] rounded-2xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                style={{
                  boxShadow: "0 20px 40px -12px rgba(11, 31, 58, 0.18), 0 8px 16px -6px rgba(11, 31, 58, 0.08)",
                }}
              >
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-100/90 flex items-center justify-between bg-slate-50/80 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-800 tracking-tight">
                      Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingAll}
                        className="text-[11px] font-medium text-sky-600 hover:text-sky-800 px-2 py-1 rounded-lg hover:bg-sky-50 transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Mark all as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mark all read</span>
                      </button>
                    )}
                    <button
                      onClick={fetchNotifications}
                      disabled={isLoading}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors sm:hidden"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Notifications Scrollable List */}
                <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100/80 bg-white">
                  {isLoading && notifications.length === 0 ? (
                    <div className="p-3 space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-3 p-1">
                          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-2.5 w-1/4" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="py-10 px-4 text-center text-xs">
                      <p className="text-rose-500 font-medium">{error}</p>
                      <button
                        onClick={fetchNotifications}
                        className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mb-3 shadow-xs">
                        <Inbox className="w-6 h-6 text-slate-400 stroke-[1.5]" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">All caught up!</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
                        You don&apos;t have any unread alerts or reminders.
                      </p>
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item._id}
                        className={`p-3 sm:p-3.5 transition-colors relative flex items-start gap-3 hover:bg-slate-50/90 ${
                          !item.isRead ? "bg-sky-50/40" : "bg-white"
                        }`}
                      >
                        {getNotificationIcon(item.type)}
                        {item.link ? (
                          <Link
                            href={item.link}
                            onClick={() => {
                              if (!item.isRead) handleMarkAsRead(item._id);
                              setIsOpen(false);
                            }}
                            className="flex-1 min-w-0 cursor-pointer block text-left"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h4
                                className={`text-xs truncate leading-snug ${
                                  !item.isRead
                                    ? "font-bold text-slate-900"
                                    : "font-medium text-slate-700"
                                }`}
                              >
                                {item.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                          </Link>
                        ) : (
                          <div className="flex-1 min-w-0 block text-left">
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <h4
                                className={`text-xs truncate leading-snug ${
                                  !item.isRead
                                    ? "font-bold text-slate-900"
                                    : "font-medium text-slate-700"
                                }`}
                              >
                                {item.title}
                              </h4>
                              <span className="text-[10px] text-slate-400 shrink-0 font-normal">
                                {formatRelativeTime(item.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                        )}
                        {!item.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(item._id);
                            }}
                            className="text-slate-300 hover:text-sky-600 shrink-0 p-1 rounded-full transition-colors self-center"
                            title="Mark as read"
                            aria-label="Mark as read"
                          >
                            <div className="w-2 h-2 rounded-full bg-sky-500 shadow-xs" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Footer link */}
                {currentUser?.role === "admin" ? (
                  <div className="p-2.5 bg-slate-50/90 border-t border-slate-100 text-center">
                    <Link
                      href="/admin/review-queue"
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>Open Task Review Queue</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50/90 border-t border-slate-100 text-center">
                    <Link
                      href="/intern/tasks"
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>View All My Tasks</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User profile button / chip */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2">
            {currentUser?.profilePicture ? (
              <img
                src={currentUser.profilePicture}
                alt={currentUser.name || "User"}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover shrink-0 ring-2 ring-sky-200/70 shadow-xs"
              />
            ) : (
              <div
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-sky-200/70 shadow-xs"
                style={{
                  background: "linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)",
                  color: "#0369A1",
                }}
                title={currentUser?.name || "User"}
              >
                {initials}
              </div>
            )}

            <div className="hidden md:block text-left max-w-[130px] lg:max-w-[180px]">
              {currentUser ? (
                <>
                  <p
                    className="font-semibold text-xs lg:text-sm leading-tight truncate"
                    style={{ color: "var(--iwms-black)" }}
                  >
                    {currentUser.name}
                  </p>
                  <p
                    className="text-[10px] lg:text-[11px] leading-tight truncate mt-0.5"
                    style={{ color: "rgba(11,31,58,.50)" }}
                  >
                    {currentUser.role === "intern"
                      ? `Intern • ${currentUser.internId || ""}`
                      : "Administrator"}
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 on mobile: Subtitle / Description (compact) */}
      {description && (
        <div className="md:hidden mt-1.5 pt-1.5 border-t border-slate-100">
          <p
            className="text-[11px] leading-snug line-clamp-1"
            style={{ color: "rgba(11,31,58,.50)" }}
          >
            {description}
          </p>
        </div>
      )}
    </header>
  );
}
