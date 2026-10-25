import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import {
  NOTIFICATION_CHANNELS,
  type NotificationPayload,
  NotificationPayloadSchema,
} from "../model/notification-schemas";

export type NotificationsModule = {
  setNotificationChannelAsync?: (
    channelId: string,
    channel: Notifications.NotificationChannelInput,
  ) => Promise<Notifications.NotificationChannel | null>;
  requestPermissionsAsync: () => Promise<Notifications.NotificationPermissionsStatus>;
  getPermissionsAsync: () => Promise<Notifications.NotificationPermissionsStatus>;
  scheduleNotificationAsync: (
    request: Notifications.NotificationRequestInput,
  ) => Promise<string>;
  cancelAllScheduledNotificationsAsync: () => Promise<void>;
};

export type NotificationService = Readonly<{
  requestPermissions: () => Promise<boolean>;
  checkPermissions: () => Promise<boolean>;
  configureChannels: () => Promise<void>;
  scheduleNotification: (payload: NotificationPayload) => Promise<string>;
  cancelAllNotifications: () => Promise<void>;
}>;

export function createNotificationService(
  module: NotificationsModule = Notifications,
): NotificationService {
  return {
    async requestPermissions(): Promise<boolean> {
      try {
        const response = await module.requestPermissionsAsync();
        return response.granted || response.status === "granted";
      } catch {
        return false;
      }
    },

    async checkPermissions(): Promise<boolean> {
      try {
        const response = await module.getPermissionsAsync();
        return response.granted || response.status === "granted";
      } catch {
        return false;
      }
    },

    async configureChannels(): Promise<void> {
      if (Platform.OS !== "android" || !module.setNotificationChannelAsync) {
        return;
      }

      for (const [key, config] of Object.entries(NOTIFICATION_CHANNELS)) {
        await module.setNotificationChannelAsync(key, {
          name: config.name,
          description: config.description,
          importance:
            config.importance === "high"
              ? AndroidImportance.HIGH
              : AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#C9431C",
        });
      }
    },

    async scheduleNotification(payload: NotificationPayload): Promise<string> {
      const validated = NotificationPayloadSchema.parse(payload);

      return await module.scheduleNotificationAsync({
        identifier: validated.id,
        content: {
          title: validated.title,
          body: validated.body,
          data: validated.data,
          sound: "default",
        },
        trigger: null, // immediate local notification
      });
    },

    async cancelAllNotifications(): Promise<void> {
      await module.cancelAllScheduledNotificationsAsync();
    },
  };
}

export const notificationService = createNotificationService();
