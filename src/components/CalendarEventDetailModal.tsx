import React, { useState } from "react";
import { ICalendarEvent } from "@/types";
import {
  X,
  Calendar,
  MapPin,
  ExternalLink,
  Users,
  AlertTriangle,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface CalendarEventDetailModalProps {
  event: ICalendarEvent | null;
  onClose: () => void;
  role: "admin" | "intern";
  onEventCancelled?: (updatedEvent: ICalendarEvent) => void;
  onEventPublished?: (updatedEvent: ICalendarEvent) => void;
}

export function CalendarEventDetailModal({
  event,
  onClose,
  role,
  onEventCancelled,
  onEventPublished,
}: CalendarEventDetailModalProps) {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!event) return null;

  const isNotice = event.type === "notice";

  const isSafeMeetingUrl = (url?: string) => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handlePublishDraft = async () => {
    if (role !== "admin") return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/calendar/events/${event._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to publish draft");
      onEventPublished?.(data.event);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (role !== "admin") return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/calendar/events/${event._id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationReason: cancellationReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel event");
      onEventCancelled?.(data.event);
      onClose();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel event");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatEventDate = (d: string | Date) => {
    return new Date(d).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatEventTime = (d: string | Date) => {
    return new Date(d).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTypeBadge = () => {
    switch (event.type) {
      case "holiday":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "meeting":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "notice":
        return "bg-amber-50 text-amber-800 border-amber-200";
      default:
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-2xs overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTypeBadge()}`}
              >
                {event.type}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                  event.status === "published"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : event.status === "draft"
                    ? "bg-slate-100 text-slate-700 border-slate-200"
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}
              >
                {event.status}
              </span>
              {event.isAllDay && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">
                  All-Day
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {event.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close details"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs text-slate-700">
          {actionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Cancellation Notice Banner */}
          {event.status === "cancelled" && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="block font-semibold">This event was cancelled</strong>
                {event.cancellationReason && (
                  <p className="mt-0.5 text-[11px] text-rose-700">
                    Reason: {event.cancellationReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description or Notice Content */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {isNotice ? "Official Notice Content" : "Description / Details"}
            </label>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed text-slate-800">
              {event.description || "No additional description provided."}
            </div>
          </div>

          {/* Scheduling Grid */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-500" /> Start
              </span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {formatEventDate(event.startDate)}
              </span>
              {!event.isAllDay && (
                <span className="text-[11px] text-slate-500">
                  {formatEventTime(event.startDate)}
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-400 font-medium block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-500" /> End
              </span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {formatEventDate(event.endDate)}
              </span>
              {!event.isAllDay && (
                <span className="text-[11px] text-slate-500">
                  {formatEventTime(event.endDate)}
                </span>
              )}
            </div>
          </div>

          {/* Location & Meeting URL */}
          {(event.location || event.meetingUrl) && (
            <div className="space-y-2 pt-1">
              {event.location && (
                <div className="flex items-center gap-2 text-slate-700">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Location: <strong>{event.location}</strong>
                  </span>
                </div>
              )}

              {event.meetingUrl && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-sky-500 shrink-0" />
                  {isSafeMeetingUrl(event.meetingUrl) ? (
                    <a
                      href={event.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-800 font-semibold underline truncate"
                    >
                      Join Meeting Link
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">Invalid meeting link</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audience Summary (Admin Only) */}
          {role === "admin" && (
            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Audience: <strong className="capitalize text-slate-700">{event.audienceType}</strong>
                {event.audienceType === "department" && ` (${event.targetDepartment})`}
                {event.audienceType === "individual" && ` (${event.targetInternIds?.length || 0} interns)`}
              </span>
            </div>
          )}

          {/* Cancellation Confirmation Box (Admin) */}
          {showCancelPrompt && (
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2.5 animate-in fade-in duration-150">
              <p className="font-bold text-rose-900 text-xs">
                Confirm Event Cancellation?
              </p>
              <p className="text-[11px] text-rose-700">
                This will mark the event as cancelled and notify all affected recipients.
              </p>
              <input
                type="text"
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Optional cancellation reason..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                >
                  {isProcessing && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Cancel Event</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2.5">
          {/* Admin Actions */}
          {role === "admin" && event.status !== "cancelled" ? (
            <div className="flex items-center gap-2">
              {!showCancelPrompt && (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Cancel Event</span>
                </button>
              )}
              {event.status === "draft" && (
                <button
                  type="button"
                  onClick={handlePublishDraft}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                >
                  {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish Draft</span>
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
