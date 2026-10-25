import { Platform } from "react-native";

import {
  createNotificationService,
  getAllowedNotificationTarget,
  type NotificationsModule,
} from "../notification-service";
import type * as Notifications from "expo-notifications";

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
    addNotificationResponseReceivedListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    clearLastNotificationResponseAsync: jest.fn(async () => undefined),
    setNotificationHandler: jest.fn(),
    ...overrides,
  };
}

describe("notification-service", () => {
  const responseWithRoute = (route: string) =>
    ({
      notification: {
        request: {
          identifier: "test-notification",
          content: { data: { route } },
        },
      },
    }) as unknown as Notifications.NotificationResponse;

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
          route:
            "/(protected)/employer/assignments/a1000000-0000-4000-8000-000000000001",
          assignmentId: "a1000000-0000-4000-8000-000000000001",
        },
      });

      expect(mock.scheduleNotificationAsync).toHaveBeenCalledWith({
        identifier: "alert-1",
        content: {
          title: "Work Submitted",
          body: "Worker submitted task for review.",
          data: {
            route:
              "/(protected)/employer/assignments/a1000000-0000-4000-8000-000000000001",
            assignmentId: "a1000000-0000-4000-8000-000000000001",
          },
          sound: "default",
        },
        trigger: { channelId: "milestone_alerts" },
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

    it("rejects a route outside the protected assignment allowlist", async () => {
      const service = createNotificationService(createMockNotifications());

      await expect(
        service.scheduleNotification({
          id: "unsafe-alert",
          title: "Unsafe",
          body: "Unsafe route",
          channelId: "general_alerts",
          data: { route: "https://attacker.example/collect" },
        }),
      ).rejects.toThrow("Notification route is not allowed");
    });
  });

  describe("notification responses", () => {
    it("accepts only allowlisted protected assignment routes", () => {
      expect(
        getAllowedNotificationTarget(
          responseWithRoute(
            "/(protected)/worker/assignments/a1000000-0000-4000-8000-000000000001",
          ),
        ),
      ).toEqual({
        id: "test-notification",
        route:
          "/(protected)/worker/assignments/a1000000-0000-4000-8000-000000000001",
      });
      expect(
        getAllowedNotificationTarget(
          responseWithRoute("https://attacker.example/collect"),
        ),
      ).toBeNull();
    });

    it("routes foreground and cold-start responses through the same validator", async () => {
      const route =
        "/(protected)/employer/assignments/a1000000-0000-4000-8000-000000000001";
      let responseListener:
        ((response: Notifications.NotificationResponse) => void) | undefined;
      const remove = jest.fn();
      const mock = createMockNotifications({
        addNotificationResponseReceivedListener: jest.fn((listener) => {
          responseListener = listener;
          return { remove };
        }),
        getLastNotificationResponseAsync: jest.fn(async () =>
          responseWithRoute(route),
        ),
      });
      const service = createNotificationService(mock);
      const onRoute = jest.fn();

      const unsubscribe = service.subscribeToResponses(onRoute);
      responseListener?.(responseWithRoute(route));

      expect(onRoute).toHaveBeenCalledWith({
        id: "test-notification",
        route,
      });
      await expect(service.getLastResponseTarget()).resolves.toEqual({
        id: "test-notification",
        route,
      });
      unsubscribe();
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it("clears the native cold-start response after it is consumed", async () => {
      const mock = createMockNotifications();
      const service = createNotificationService(mock);

      await service.clearLastResponse();

      expect(mock.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
    });
  });
});
