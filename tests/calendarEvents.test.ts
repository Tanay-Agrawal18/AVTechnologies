import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { POST as createEventPOST } from "@/app/api/admin/calendar/events/route";
import { POST as cancelEventPOST } from "@/app/api/admin/calendar/events/[id]/cancel/route";
import { GET as internEventsGET } from "@/app/api/intern/calendar/events/route";
import { GET as internSingleEventGET } from "@/app/api/intern/calendar/events/[id]/route";
import { CalendarEvent } from "@/models/CalendarEvent";
import { User } from "@/models/User";
import { requireAuth } from "@/lib/apiAuth";
import { CalendarEventNotificationService } from "@/services/calendarEventNotificationService";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/apiAuth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/models/CalendarEvent", () => ({
  CalendarEvent: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateOne: vi.fn(),
  },
}));

vi.mock("@/models/User", () => ({
  User: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/services/calendarEventNotificationService", () => ({
  CalendarEventNotificationService: {
    notifyEventPublished: vi.fn().mockResolvedValue({ sentCount: 1 }),
    notifyEventUpdated: vi.fn().mockResolvedValue({ sentCount: 1 }),
    notifyEventCancelled: vi.fn().mockResolvedValue({ sentCount: 1 }),
  },
}));

describe("Admin-Managed Calendar, Holidays, Meetings & Notices Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Security & RBAC Guard Enforcement", () => {
    it("rejects unauthenticated requests to create calendar event", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({ title: "Holi" }),
      });
      const res = await createEventPOST(req);
      expect(res.status).toBe(401);
    });

    it("rejects intern attempts to access admin calendar creation route", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: false,
        response: NextResponse.json({ error: "Forbidden: Admin required" }, { status: 403 }),
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({ title: "Team Meeting" }),
      });
      const res = await createEventPOST(req);
      expect(res.status).toBe(403);
    });

    it("rejects invalid or unsafe meeting URLs", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Design Sync",
          type: "meeting",
          startDate: "2026-11-10T10:00:00.000Z",
          endDate: "2026-11-10T11:00:00.000Z",
          meetingUrl: "javascript:alert(1)",
        }),
      });

      const res = await createEventPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });

    it("rejects invalid date combinations where end date precedes start date", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: "admin-1", role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Diwali Vacation",
          type: "holiday",
          startDate: "2026-11-15T00:00:00.000Z",
          endDate: "2026-11-10T00:00:00.000Z", // Invalid: precedes start
        }),
      });

      const res = await createEventPOST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Validation failed");
    });
  });

  describe("2. Event Creation, Publishing & Notification Integration", () => {
    const adminObjectId = new mongoose.Types.ObjectId().toString();

    it("successfully creates a company holiday as a draft without triggering notifications", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: adminObjectId, role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const mockCreatedEvent = {
        _id: new mongoose.Types.ObjectId(),
        title: "Diwali Celebration",
        type: "holiday",
        startDate: new Date("2026-11-12T00:00:00.000Z"),
        endDate: new Date("2026-11-14T23:59:59.000Z"),
        isAllDay: true,
        audienceType: "all",
        status: "draft",
      };

      vi.mocked(CalendarEvent.create).mockResolvedValueOnce(mockCreatedEvent as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Diwali Celebration",
          type: "holiday",
          startDate: "2026-11-12T00:00:00.000Z",
          endDate: "2026-11-14T23:59:59.000Z",
          isAllDay: true,
          audienceType: "all",
          status: "draft",
        }),
      });

      const res = await createEventPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.event.title).toBe("Diwali Celebration");
      expect(json.event.status).toBe("draft");
      // Notification service should not be called for drafts
      expect(CalendarEventNotificationService.notifyEventPublished).not.toHaveBeenCalled();
    });

    it("publishes an official notice and dispatches notifications immediately", async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: adminObjectId, role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const mockEvent = {
        _id: new mongoose.Types.ObjectId(),
        title: "Important Milestone Announcement",
        type: "notice",
        startDate: new Date("2026-11-20T00:00:00.000Z"),
        endDate: new Date("2026-11-20T23:59:59.000Z"),
        audienceType: "all",
        status: "published",
      };

      vi.mocked(CalendarEvent.create).mockResolvedValueOnce(mockEvent as any);

      const req = new NextRequest("http://localhost:3000/api/admin/calendar/events", {
        method: "POST",
        body: JSON.stringify({
          title: "Important Milestone Announcement",
          type: "notice",
          startDate: "2026-11-20T00:00:00.000Z",
          endDate: "2026-11-20T23:59:59.000Z",
          audienceType: "all",
          status: "published",
        }),
      });

      const res = await createEventPOST(req);
      expect(res.status).toBe(201);
      expect(CalendarEventNotificationService.notifyEventPublished).toHaveBeenCalledWith(
        mockEvent,
        expect.objectContaining({ id: adminObjectId })
      );
    });

    it("cancels an active event with a reason and notifies recipients", async () => {
      const eventId = new mongoose.Types.ObjectId().toString();
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: adminObjectId, role: "admin", name: "Admin", email: "admin@corp.com", status: "active" },
      } as any);

      const mockDoc: {
        _id: string;
        title: string;
        status: string;
        cancellationReason?: string;
        save: ReturnType<typeof vi.fn>;
      } = {
        _id: eventId,
        title: "Townhall Sync",
        status: "published",
        save: vi.fn().mockResolvedValue(true),
      };

      vi.mocked(CalendarEvent.findById).mockResolvedValueOnce(mockDoc as any);

      const req = new NextRequest(`http://localhost:3000/api/admin/calendar/events/${eventId}/cancel`, {
        method: "POST",
        body: JSON.stringify({ cancellationReason: "Speaker unavailable" }),
      });

      const res = await cancelEventPOST(req, { params: Promise.resolve({ id: eventId }) });
      expect(res.status).toBe(200);
      expect(mockDoc.status).toBe("cancelled");
      expect(mockDoc.cancellationReason).toBe("Speaker unavailable");
      expect(CalendarEventNotificationService.notifyEventCancelled).toHaveBeenCalledWith(
        mockDoc,
        expect.objectContaining({ id: adminObjectId }),
        "Speaker unavailable"
      );
    });
  });

  describe("3. Intern Audience Isolation & Safe Access", () => {
    it("excludes drafts and cancelled events from intern calendar query", async () => {
      const internId = new mongoose.Types.ObjectId();
      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: internId.toString(), role: "intern", name: "Intern 1", email: "intern@corp.com", status: "active" },
      } as any);

      vi.mocked(User.findById).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({ department: "Engineering" }),
        }),
      } as any);

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValueOnce([
          {
            _id: "evt-1",
            title: "Diwali Holiday",
            type: "holiday",
            status: "published",
            audienceType: "all",
          },
        ]),
      };
      vi.mocked(CalendarEvent.find).mockReturnValueOnce(mockChain as any);

      const req = new NextRequest("http://localhost:3000/api/intern/calendar/events");
      const res = await internEventsGET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.events).toHaveLength(1);
      expect(CalendarEvent.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "published", // Strictly published
          $or: expect.arrayContaining([
            { audienceType: "all" },
            { audienceType: "department", targetDepartment: "Engineering" },
          ]),
        })
      );
    });

    it("prevents an intern from reading targeted events addressed to another intern", async () => {
      const requestingInternId = new mongoose.Types.ObjectId().toString();
      const targetedOtherInternId = new mongoose.Types.ObjectId();
      const eventId = new mongoose.Types.ObjectId().toString();

      vi.mocked(requireAuth).mockResolvedValueOnce({
        ok: true,
        user: { id: requestingInternId, role: "intern", name: "Intern 1", email: "intern@corp.com", status: "active" },
      } as any);

      vi.mocked(User.findById).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          lean: vi.fn().mockResolvedValueOnce({ department: "Design" }),
        }),
      } as any);

      vi.mocked(CalendarEvent.findById).mockReturnValueOnce({
        lean: vi.fn().mockResolvedValueOnce({
          _id: eventId,
          title: "Private Mentorship Sync",
          type: "meeting",
          status: "published",
          audienceType: "individual",
          targetInternIds: [targetedOtherInternId], // Not the caller!
        }),
      } as any);

      const req = new NextRequest(`http://localhost:3000/api/intern/calendar/events/${eventId}`);
      const res = await internSingleEventGET(req, { params: Promise.resolve({ id: eventId }) });

      // IDOR defense: returns 404 to avoid leaking existence of private events
      expect(res.status).toBe(404);
    });
  });
});
