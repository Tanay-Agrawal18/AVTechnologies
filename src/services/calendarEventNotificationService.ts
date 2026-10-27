import { connectDB } from "@/lib/db";
import { CalendarEvent, ICalendarEventDocument } from "@/models/CalendarEvent";
import { User } from "@/models/User";
import { NotificationService } from "@/services/notificationService";
import { realtimeBus } from "@/lib/realtime";
import { SessionUser } from "@/types";

export class CalendarEventNotificationService {
  /**
   * Resolves recipient user IDs based on the event's audience definition.
   * Only returns active intern users to maintain integrity.
   */
  static async resolveRecipientIds(
    event: ICalendarEventDocument
  ): Promise<string[]> {
    await connectDB();

    if (event.audienceType === "all") {
      const activeInterns = await User.find({
        role: "intern",
        status: "active",
      })
        .select("_id")
        .lean();
      return activeInterns.map((u) => u._id.toString());
    }

    if (event.audienceType === "department" && event.targetDepartment) {
      const deptInterns = await User.find({
        role: "intern",
        status: "active",
        department: event.targetDepartment,
      })
        .select("_id")
        .lean();
      return deptInterns.map((u) => u._id.toString());
    }

    if (event.audienceType === "individual" && event.targetInternIds?.length) {
      // Validate that specified individual recipients are active interns
      const validInterns = await User.find({
        _id: { $in: event.targetInternIds },
        role: "intern",
        status: "active",
      })
        .select("_id")
        .lean();
      return validInterns.map((u) => u._id.toString());
    }

    return [];
  }

  /**
   * Formats the event notification title according to event type.
   */
  private static formatTitle(
    event: ICalendarEventDocument,
    action: "published" | "updated" | "cancelled"
  ): string {
    const typeLabel =
      event.type === "holiday"
        ? "Holiday Announcement"
        : event.type === "meeting"
        ? "Meeting Scheduled"
        : event.type === "notice"
        ? "Official Notice"
        : "Company Event";

    if (action === "cancelled") {
      return `Cancelled: ${event.title}`;
    }
    if (action === "updated") {
      return `Updated: ${event.title}`;
    }
    return `${typeLabel}: ${event.title}`;
  }

  /**
   * Dispatches notifications to audience when an event is published.
   * Uses idempotent keys to guarantee delivery without duplication on retries.
   */
  static async notifyEventPublished(
    event: ICalendarEventDocument,
    actor: SessionUser
  ): Promise<{ sentCount: number }> {
    const recipientIds = await this.resolveRecipientIds(event);
    if (!recipientIds.length) return { sentCount: 0 };

    const eventVersion = (event.notificationSentVersion || 0) + 1;
    const title = this.formatTitle(event, "published");
    const link = `/intern/calendar?eventId=${event._id}`;

    let message = event.description
      ? event.description.slice(0, 150)
      : `New ${event.type} has been scheduled from ${new Date(
          event.startDate
        ).toLocaleDateString()}.`;

    if (event.type === "meeting" && event.location) {
      message += ` Location: ${event.location}`;
    }

    let sent = 0;
    for (const recipientId of recipientIds) {
      const idempotencyKey = `cal_pub:${event._id}:v${eventVersion}:${recipientId}`;
      const res = await NotificationService.createNotification({
        recipientId,
        actorId: actor.id,
        actorName: actor.name,
        type: "calendar_event_published",
        title,
        message,
        link,
        idempotencyKey,
        metadata: {
          eventId: event._id.toString(),
          eventType: event.type,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
        },
      });
      if (res.created) sent++;
    }

    // Increment notificationSentVersion on the event
    await CalendarEvent.updateOne(
      { _id: event._id },
      { $set: { notificationSentVersion: eventVersion } }
    );

    try {
      realtimeBus.emit(
        "calendar_event_changed",
        {
          eventId: event._id.toString(),
          action: "published",
          title: event.title,
          type: event.type,
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[CalendarEventNotificationService] Realtime emit error on published:", err);
    }

    return { sentCount: sent };
  }

  /**
   * Dispatches notifications when an already-published event is materially updated.
   */
  static async notifyEventUpdated(
    event: ICalendarEventDocument,
    actor: SessionUser
  ): Promise<{ sentCount: number }> {
    const recipientIds = await this.resolveRecipientIds(event);
    if (!recipientIds.length) return { sentCount: 0 };

    const eventVersion = (event.notificationSentVersion || 0) + 1;
    const title = this.formatTitle(event, "updated");
    const link = `/intern/calendar?eventId=${event._id}`;
    const message = `The details for "${event.title}" have been updated. Dates: ${new Date(
      event.startDate
    ).toLocaleDateString()} – ${new Date(event.endDate).toLocaleDateString()}.`;

    let sent = 0;
    for (const recipientId of recipientIds) {
      const idempotencyKey = `cal_upd:${event._id}:v${eventVersion}:${recipientId}`;
      const res = await NotificationService.createNotification({
        recipientId,
        actorId: actor.id,
        actorName: actor.name,
        type: "calendar_event_updated",
        title,
        message,
        link,
        idempotencyKey,
        metadata: {
          eventId: event._id.toString(),
          eventType: event.type,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
        },
      });
      if (res.created) sent++;
    }

    await CalendarEvent.updateOne(
      { _id: event._id },
      { $set: { notificationSentVersion: eventVersion } }
    );

    try {
      realtimeBus.emit(
        "calendar_event_changed",
        {
          eventId: event._id.toString(),
          action: "updated",
          title: event.title,
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[CalendarEventNotificationService] Realtime emit error on updated:", err);
    }

    return { sentCount: sent };
  }

  /**
   * Dispatches notifications when an active/published event is cancelled.
   */
  static async notifyEventCancelled(
    event: ICalendarEventDocument,
    actor: SessionUser,
    reason?: string
  ): Promise<{ sentCount: number }> {
    const recipientIds = await this.resolveRecipientIds(event);
    if (!recipientIds.length) return { sentCount: 0 };

    const title = this.formatTitle(event, "cancelled");
    const message = reason
      ? `"${event.title}" has been cancelled. Reason: ${reason}`
      : `"${event.title}" scheduled for ${new Date(
          event.startDate
        ).toLocaleDateString()} has been cancelled.`;

    let sent = 0;
    for (const recipientId of recipientIds) {
      const idempotencyKey = `cal_cnc:${event._id}:${recipientId}`;
      const res = await NotificationService.createNotification({
        recipientId,
        actorId: actor.id,
        actorName: actor.name,
        type: "calendar_event_cancelled",
        title,
        message,
        link: "/intern/calendar",
        idempotencyKey,
        metadata: {
          eventId: event._id.toString(),
          eventType: event.type,
          cancellationReason: reason,
        },
      });
      if (res.created) sent++;
    }

    try {
      realtimeBus.emit(
        "calendar_event_changed",
        {
          eventId: event._id.toString(),
          action: "cancelled",
          title: event.title,
          reason,
        },
        { broadcast: true }
      );
    } catch (err) {
      console.error("[CalendarEventNotificationService] Realtime emit error on cancelled:", err);
    }

    return { sentCount: sent };
  }
}
