import { z } from "zod";

export const NOTIFICATION_CHANNEL_IDS = [
  "assignment_updates",
  "milestone_alerts",
  "general_alerts",
] as const;

export const NotificationChannelIdSchema = z.enum(NOTIFICATION_CHANNEL_IDS);

export type NotificationChannelId = z.infer<typeof NotificationChannelIdSchema>;

export const NOTIFICATION_CHANNELS: Record<
  NotificationChannelId,
  { name: string; description: string; importance: "high" | "default" }
> = {
  assignment_updates: {
    name: "Assignment Updates",
    description:
      "Notifications about confirmations, agreements, and status changes.",
    importance: "high",
  },
  milestone_alerts: {
    name: "Milestone & Submission Alerts",
    description: "Work submission reviews, revisions, and approvals.",
    importance: "high",
  },
  general_alerts: {
    name: "Activity & Community",
    description: "General activity feed updates and announcements.",
    importance: "default",
  },
};

const assignmentRoutePattern =
  /^\/\(protected\)\/(worker|employer)\/assignments\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const NotificationRouteSchema = z
  .string()
  .regex(assignmentRoutePattern, "Notification route is not allowed.");

export const NotificationPayloadSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  channelId: NotificationChannelIdSchema.default("assignment_updates"),
  data: z
    .object({
      route: NotificationRouteSchema.optional(),
      assignmentId: z.string().uuid().optional(),
      gigId: z.string().uuid().optional(),
      eventType: z.string().optional(),
    })
    .default({}),
});

export type NotificationPayload = z.infer<typeof NotificationPayloadSchema>;
