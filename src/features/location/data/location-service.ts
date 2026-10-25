import * as ExpoLocation from "expo-location";

import {
  type LocationCoordinates,
  LocationCoordinatesSchema,
  type LocationPermissionState,
} from "../model/location-schemas";

export type LocationModule = {
  getForegroundPermissionsAsync: () => Promise<ExpoLocation.LocationPermissionResponse>;
  requestForegroundPermissionsAsync: () => Promise<ExpoLocation.LocationPermissionResponse>;
  hasServicesEnabledAsync: () => Promise<boolean>;
  getCurrentPositionAsync: (
    options?: ExpoLocation.LocationOptions,
  ) => Promise<ExpoLocation.LocationObject>;
  Accuracy: typeof ExpoLocation.Accuracy;
};

export type GetCurrentPositionOptions = Readonly<{
  timeoutMs?: number;
}>;

export type LocationService = Readonly<{
  checkPermission: () => Promise<LocationPermissionState>;
  requestPermission: () => Promise<LocationPermissionState>;
  getCurrentPosition: (
    options?: GetCurrentPositionOptions,
  ) => Promise<LocationCoordinates>;
  isLocationServicesEnabled: () => Promise<boolean>;
}>;

export const DEFAULT_LOCATION_TIMEOUT_MS = 5000;

function mapPermissionResponse(
  response: ExpoLocation.LocationPermissionResponse,
): LocationPermissionState {
  if (
    response.granted ||
    response.status === ExpoLocation.PermissionStatus.GRANTED
  ) {
    return "granted";
  }
  if (response.status === ExpoLocation.PermissionStatus.DENIED) {
    if (response.canAskAgain === false) {
      return "blocked";
    }
    return "denied";
  }
  if (response.status === ExpoLocation.PermissionStatus.UNDETERMINED) {
    return "undetermined";
  }
  return "denied";
}

export function createLocationService(
  module: LocationModule = ExpoLocation,
): LocationService {
  return {
    async isLocationServicesEnabled(): Promise<boolean> {
      try {
        return await module.hasServicesEnabledAsync();
      } catch {
        return false;
      }
    },

    async checkPermission(): Promise<LocationPermissionState> {
      try {
        const servicesEnabled = await module.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return "services_disabled";
        }
        const response = await module.getForegroundPermissionsAsync();
        return mapPermissionResponse(response);
      } catch {
        return "denied";
      }
    },

    async requestPermission(): Promise<LocationPermissionState> {
      try {
        const servicesEnabled = await module.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          return "services_disabled";
        }
        const response = await module.requestForegroundPermissionsAsync();
        return mapPermissionResponse(response);
      } catch {
        return "denied";
      }
    },

    async getCurrentPosition(
      options: GetCurrentPositionOptions = {},
    ): Promise<LocationCoordinates> {
      const timeoutMs = options.timeoutMs ?? DEFAULT_LOCATION_TIMEOUT_MS;

      const servicesEnabled = await module.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        throw new Error("Device location services are disabled");
      }

      const permission = await module.getForegroundPermissionsAsync();
      if (
        !permission.granted &&
        permission.status !== ExpoLocation.PermissionStatus.GRANTED
      ) {
        throw new Error("Foreground location permission not granted");
      }

      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Location request timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      try {
        const position = await Promise.race([
          module.getCurrentPositionAsync({
            accuracy: module.Accuracy.Balanced,
          }),
          timeoutPromise,
        ]);

        return LocationCoordinatesSchema.parse({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          timestamp: position.timestamp,
        });
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

export const locationService = createLocationService();
