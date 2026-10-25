import { Platform } from "react-native";

import {
  createNotificationService,
  type NotificationsModule,
} from "../notification-service";

function createMockNotifications(
  overrides: Partial<NotificationsModule> = {},
): NotificationsModule {
  return {
    requestPermissionsAsync: jest.fn().mockResolvedValue({
      status: "granted",
      granted: true,
      canAskAgain: true,
      expires: "never",
    }),
    getPermissionsAsync: jest.fn().mockResolvedValue({
      status: "granted",
      granted: true,
      canAskAgain: true,
      expires: "never",
    }),
    setNotificationChannelAsync: jest.fn().mockResolvedValue({
      id: "assignment_updates",
      name: "Assignment Updates",
      importance: 4,
    }),
    scheduleNotificationAsync: jest.fn().mockResolvedValue("notif-id-123"),
    cancelAllScheduledNotificationsAsync: jest
      .fn()
      .mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("notification-service", () => {
  describe("permissions", () => {
    it("requests permissions and returns true when granted", async () => {
      const mock = createMockNotifications();
      const service = createNotificationService(mock);

      const granted = await service.requestPermissions();
      expect(mock.requestPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(granted).toBe(true);
    });

    it("returns false when permission request is denied", async () => {
      const mock = createMockNotifications({
        requestPermissionsAsync: jest.fn().mockResolvedValue({
          status: "denied",
          granted: false,
          canAskAgain: false,
          expires: "never",
        }),
      });
      const service = createNotificationService(mock);

      const granted = await service.requestPermissions();
      expect(granted).toBe(false);
    });

    it("checks permissions status", async () => {
      const mock = createMockNotifications();
      const service = createNotificationService(mock);

      const granted = await service.checkPermissions();
      expect(mock.getPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(granted).toBe(true);
    });
  });

  describe("configureChannels", () => {
    it("configures channels on Android platform", async () => {
      Platform.OS = "android";
      const mock = createMockNotifications();
      const service = createNotificationService(mock);

      await service.configureChannels();
      expect(mock.setNotificationChannelAsync).toHaveBeenCalledTimes(3);
    });
  });

  describe("scheduleNotification", () => {
    it("schedules immediate notification with valid payload", async () => {
      const mock = createMockNotifications();
      const service = createNotificationService(mock);

      const id = await service.scheduleNotification({
        id: "alert-1",
        title: "Work Submitted",
        body: "Worker submitted task for review.",
        channelId: "milestone_alerts",
        data: {
          route: "/(protected)/employer/assignments/a1",
        },
      });

      expect(mock.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: "alert-1",
        content: {
          title: "Work Submitted",
          body: "Worker submitted task for review.",
          data: {
            route: "/(protected)/employer/assignments/a1",
          },
          sound: "default",
        },
        trigger: null,
      });
      expect(id).toBe("notif-id-123");
    });

    it("cancels all notifications", async () => {
      const mock = createMockNotifications();
      const service = createNotificationService(mock);

      await service.cancelAllNotifications();
      expect(mock.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
