import {
  NOTIFICATION_CHANNEL_IDS,
  NOTIFICATION_CHANNELS,
  NotificationChannelIdSchema,
  NotificationPayloadSchema,
} from "../notification-schemas";

describe("notification-schemas", () => {
  it("validates valid notification payload", () => {
    const payload = {
      id: "alert-1",
      title: "Work Submitted for Review",
      body: "Ari Santos submitted photos for Event Photography.",
      channelId: "milestone_alerts" as const,
      data: {
        route:
          "/(protected)/employer/assignments/a0000000-0000-4000-8000-000000000001",
        assignmentId: "a0000000-0000-4000-8000-000000000001",
        eventType: "work_submitted",
      },
    };
    const parsed = NotificationPayloadSchema.parse(payload);
    expect(parsed.title).toBe("Work Submitted for Review");
    expect(parsed.channelId).toBe("milestone_alerts");
  });

  it("applies default channel when channelId is omitted", () => {
    const payload = {
      id: "alert-2",
      title: "Assignment Confirmed",
      body: "Worker accepted the agreement.",
    };
    const parsed = NotificationPayloadSchema.parse(payload);
    expect(parsed.channelId).toBe("assignment_updates");
  });

  it("rejects invalid channelId", () => {
    expect(() =>
      NotificationChannelIdSchema.parse("invalid_channel"),
    ).toThrow();
  });

  it("has configuration for all defined channels", () => {
    for (const channelId of NOTIFICATION_CHANNEL_IDS) {
      expect(NOTIFICATION_CHANNELS[channelId]).toBeDefined();
      expect(NOTIFICATION_CHANNELS[channelId].name).toBeTruthy();
    }
  });
});
