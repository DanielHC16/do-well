import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";
import { Platform } from "react-native";

import {
  NOTIFICATION_CHANNELS,
  type NotificationPayload,
  NotificationPayloadSchema,
  NotificationRouteSchema,
} from "../model/notification-schemas";

type NotificationResponseSubscription = Readonly<{ remove: () => void }>;
export type NotificationResponseTarget = Readonly<{
  id: string;
  route: string;
}>;

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
  addNotificationResponseReceivedListener?: (
    listener: (response: Notifications.NotificationResponse) => void,
  ) => NotificationResponseSubscription;
  getLastNotificationResponseAsync?: () => Promise<Notifications.NotificationResponse | null>;
  clearLastNotificationResponseAsync?: () => Promise<void>;
  setNotificationHandler?: typeof Notifications.setNotificationHandler;
};

export type NotificationService = Readonly<{
  requestPermissions: () => Promise<boolean>;
  checkPermissions: () => Promise<boolean>;
  configureChannels: () => Promise<void>;
  scheduleNotification: (payload: NotificationPayload) => Promise<string>;
  cancelAllNotifications: () => Promise<void>;
  configureForegroundPresentation: () => void;
  subscribeToResponses: (
    listener: (target: NotificationResponseTarget) => void,
  ) => () => void;
  getLastResponseTarget: () => Promise<NotificationResponseTarget | null>;
  clearLastResponse: () => Promise<void>;
}>;

export function getAllowedNotificationTarget(
  response: Notifications.NotificationResponse,
): NotificationResponseTarget | null {
  const route = response.notification.request.content.data?.route;
  const parsed = NotificationRouteSchema.safeParse(route);
  return parsed.success
    ? { id: response.notification.request.identifier, route: parsed.data }
    : null;
}

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
        trigger: { channelId: validated.channelId },
      });
    },

    async cancelAllNotifications(): Promise<void> {
      await module.cancelAllScheduledNotificationsAsync();
    },

    configureForegroundPresentation(): void {
      module.setNotificationHandler?.({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    },

    subscribeToResponses(
      listener: (target: NotificationResponseTarget) => void,
    ): () => void {
      if (!module.addNotificationResponseReceivedListener) return () => {};
      const subscription = module.addNotificationResponseReceivedListener(
        (response) => {
          const target = getAllowedNotificationTarget(response);
          if (target) listener(target);
        },
      );
      return () => subscription.remove();
    },

    async getLastResponseTarget(): Promise<NotificationResponseTarget | null> {
      if (!module.getLastNotificationResponseAsync) return null;
      const response = await module.getLastNotificationResponseAsync();
      return response ? getAllowedNotificationTarget(response) : null;
    },

    async clearLastResponse(): Promise<void> {
      await module.clearLastNotificationResponseAsync?.();
    },
  };
}

export const notificationService = createNotificationService();
