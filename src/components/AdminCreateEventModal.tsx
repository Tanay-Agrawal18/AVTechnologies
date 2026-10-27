import React, { useState } from "react";
import {
  CalendarEventType,
  CalendarAudienceType,
  ICalendarEvent,
} from "@/types";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Link as LinkIcon,
  Users,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface AdminCreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (event: ICalendarEvent) => void;
  interns: Array<{ _id: string; name: string; internId?: string; department?: string }>;
  departments: string[];
  initialType?: CalendarEventType;
}

export function AdminCreateEventModal({
  isOpen,
  onClose,
  onSuccess,
  interns,
  departments,
  initialType = "holiday",
}: AdminCreateEventModalProps) {
  const [type, setType] = useState<CalendarEventType>(initialType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [endTime, setEndTime] = useState("18:00");
  const [isAllDay, setIsAllDay] = useState(type === "holiday");
  const [location, setLocation] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [audienceType, setAudienceType] = useState<CalendarAudienceType>("all");
  const [targetDepartment, setTargetDepartment] = useState(departments[0] || "");
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTypeSelect = (selected: CalendarEventType) => {
    setType(selected);
    if (selected === "holiday") {
      setIsAllDay(true);
    }
  };

  const toggleInternSelection = (id: string) => {
    setSelectedInternIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    let startIso: string;
    let endIso: string;

    if (isAllDay) {
      startIso = new Date(`${startDate}T00:00:00`).toISOString();
      endIso = new Date(`${endDate}T23:59:59`).toISOString();
    } else {
      startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
      endIso = new Date(`${endDate}T${endTime}:00`).toISOString();
    }

    if (new Date(endIso).getTime() < new Date(startIso).getTime()) {
      setError("End date and time cannot precede start date and time.");
      return;
    }

    if (audienceType === "individual" && selectedInternIds.length === 0) {
      setError("Please select at least one intern for individual audience.");
      return;
    }

    if (audienceType === "department" && !targetDepartment) {
      setError("Please select a target department.");
      return;
    }

    if (meetingUrl.trim()) {
      try {
        const u = new URL(meetingUrl.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          setError("Meeting URL must be an http or https web link.");
          return;
        }
      } catch {
        setError("Invalid Meeting URL format.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        startDate: startIso,
        endDate: endIso,
        isAllDay,
        location: location.trim() || undefined,
        meetingUrl: meetingUrl.trim() || undefined,
        audienceType,
        targetDepartment: audienceType === "department" ? targetDepartment : undefined,
        targetInternIds: audienceType === "individual" ? selectedInternIds : [],
        status: publishImmediately ? "published" : "draft",
      };

      const res = await fetch("/api/admin/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create event");
      }

      onSuccess(data.event);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-2xs overflow-y-auto">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Create Calendar Entry
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Publish holidays, meetings, announcements, or company events
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Type Tabs */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              Event Type
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(["holiday", "meeting", "event", "notice"] as CalendarEventType[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleTypeSelect(item)}
                    className={`py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                      type === item
                        ? "bg-white text-sky-800 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "holiday"
                  ? "e.g. Diwali Holiday / Annual Vacation"
                  : type === "meeting"
                  ? "e.g. Weekly Sprint Sync"
                  : type === "notice"
                  ? "e.g. Policy Update: Deliverable Guidelines"
                  : "e.g. Tech Talk & Demo Day"
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              {type === "notice" ? "Notice Content" : "Description / Agenda"}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide relevant details, agendas, or guidelines..."
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Dates & Times */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">Date & Scheduling</label>
              <label className="flex items-center gap-1.5 text-slate-600 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>All-Day Event</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-slate-500 block mb-1">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                />
                {!isAllDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full mt-1.5 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                )}
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block mb-1">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                />
                {!isAllDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full mt-1.5 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Location & Meeting URL (specifically useful for meetings/events) */}
          {(type === "meeting" || type === "event") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Conference Room A / Remote"
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Meeting URL (Optional)
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="url"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audience & Recipients */}
          <div className="pt-1 border-t border-slate-100 space-y-2">
            <label className="font-semibold text-slate-700 block">
              Audience & Recipients
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                className={`p-2.5 border rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 transition-all ${
                  audienceType === "all"
                    ? "border-sky-500 bg-sky-50/50 text-sky-900 font-bold"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="audienceType"
                  value="all"
                  checked={audienceType === "all"}
                  onChange={() => setAudienceType("all")}
                  className="sr-only"
                />
                <Users className="w-4 h-4 text-sky-600" />
                <span className="text-[11px]">All Interns</span>
              </label>

              <label
                className={`p-2.5 border rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 transition-all ${
                  audienceType === "department"
                    ? "border-sky-500 bg-sky-50/50 text-sky-900 font-bold"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="audienceType"
                  value="department"
                  checked={audienceType === "department"}
                  onChange={() => setAudienceType("department")}
                  className="sr-only"
                />
                <Calendar className="w-4 h-4 text-sky-600" />
                <span className="text-[11px]">Department</span>
              </label>

              <label
                className={`p-2.5 border rounded-xl cursor-pointer flex flex-col items-center text-center gap-1 transition-all ${
                  audienceType === "individual"
                    ? "border-sky-500 bg-sky-50/50 text-sky-900 font-bold"
                    : "border-slate-200 hover:border-slate-300 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="audienceType"
                  value="individual"
                  checked={audienceType === "individual"}
                  onChange={() => setAudienceType("individual")}
                  className="sr-only"
                />
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="text-[11px]">Select Interns</span>
              </label>
            </div>

            {/* Department picker */}
            {audienceType === "department" && (
              <div className="pt-2">
                <label className="text-[11px] text-slate-500 block mb-1">
                  Select Department
                </label>
                <select
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                >
                  {departments.length === 0 ? (
                    <option value="">No departments found</option>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Individual interns picker */}
            {audienceType === "individual" && (
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Selected ({selectedInternIds.length})</span>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInternIds(interns.map((i) => i._id))}
                      className="text-sky-600 hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInternIds([])}
                      className="text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 p-1">
                  {interns.length === 0 ? (
                    <div className="p-3 text-center text-slate-400">
                      No active interns available
                    </div>
                  ) : (
                    interns.map((intern) => {
                      const isSelected = selectedInternIds.includes(intern._id);
                      return (
                        <div
                          key={intern._id}
                          onClick={() => toggleInternSelection(intern._id)}
                          className={`p-2 flex items-center justify-between cursor-pointer rounded transition-colors ${
                            isSelected ? "bg-sky-50 text-sky-900" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <span className="font-semibold block">{intern.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {intern.internId || ""} {intern.department ? `• ${intern.department}` : ""}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded text-sky-600 focus:ring-sky-500 pointer-events-none"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-colors shadow-2xs disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Publish Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
