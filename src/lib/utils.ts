import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStringOrDate?: string | Date | null): string {
  if (!dateStringOrDate) return "N/A";
  const date = new Date(dateStringOrDate);
  if (isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateStringOrDate?: string | Date | null): string {
  if (!dateStringOrDate) return "N/A";
  const date = new Date(dateStringOrDate);
  if (isNaN(date.getTime())) return "Invalid date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "assigned":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "submitted":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "changes_requested":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "inactive":
      return "bg-slate-100 text-slate-600 border-slate-300";
    case "pending_setup":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-300";
  }
}

export function getPriorityBadgeClass(priority: string): string {
  switch (priority) {
    case "low":
      return "bg-slate-100 text-slate-700";
    case "medium":
      return "bg-blue-100 text-blue-700";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "urgent":
      return "bg-rose-50 text-rose-600 border border-rose-200/60 font-bold";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
