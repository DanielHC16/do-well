import * as ExpoLocation from "expo-location";

import {
  createLocationService,
  type LocationModule,
} from "../location-service";

function createMockLocationModule(
  overrides: Partial<LocationModule> = {},
): LocationModule {
  return {
    Accuracy: {
      Lowest: 1,
      Low: 2,
      Balanced: 3,
      High: 4,
      Highest: 5,
      BestForNavigation: 6,
    } as typeof ExpoLocation.Accuracy,
    hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
    getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
      status: ExpoLocation.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    }),
    requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({
      status: ExpoLocation.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    }),
    getCurrentPositionAsync: jest.fn().mockResolvedValue({
      coords: {
        latitude: 14.5547,
        longitude: 121.0244,
        accuracy: 15,
        altitude: 20,
        altitudeAccuracy: 5,
        heading: 0,
        speed: 0,
      },
      timestamp: 1729864800000,
    }),
    ...overrides,
  };
}

describe("location-service", () => {
  describe("isLocationServicesEnabled", () => {
    it("returns true when enabled", async () => {
      const module = createMockLocationModule();
      const service = createLocationService(module);
      await expect(service.isLocationServicesEnabled()).resolves.toBe(true);
    });

    it("returns false when disabled", async () => {
      const module = createMockLocationModule({
        hasServicesEnabledAsync: jest.fn().mockResolvedValue(false),
      });
      const service = createLocationService(module);
      await expect(service.isLocationServicesEnabled()).resolves.toBe(false);
    });

    it("returns false when module throws", async () => {
      const module = createMockLocationModule({
        hasServicesEnabledAsync: jest
          .fn()
          .mockRejectedValue(new Error("Hardware failure")),
      });
      const service = createLocationService(module);
      await expect(service.isLocationServicesEnabled()).resolves.toBe(false);
    });
  });

  describe("checkPermission", () => {
    it("returns services_disabled when location services are off", async () => {
      const module = createMockLocationModule({
        hasServicesEnabledAsync: jest.fn().mockResolvedValue(false),
      });
      const service = createLocationService(module);
      const state = await service.checkPermission();
      expect(state).toBe("services_disabled");
    });

    it("returns granted when permission is granted", async () => {
      const module = createMockLocationModule();
      const service = createLocationService(module);
      const state = await service.checkPermission();
      expect(state).toBe("granted");
    });

    it("returns denied when permission is denied with canAskAgain = true", async () => {
      const module = createMockLocationModule({
        getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
          status: ExpoLocation.PermissionStatus.DENIED,
          granted: false,
          canAskAgain: true,
          expires: "never",
        }),
      });
      const service = createLocationService(module);
      const state = await service.checkPermission();
      expect(state).toBe("denied");
    });

    it("returns blocked when permission is denied with canAskAgain = false", async () => {
      const module = createMockLocationModule({
        getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
          status: ExpoLocation.PermissionStatus.DENIED,
          granted: false,
          canAskAgain: false,
          expires: "never",
        }),
      });
      const service = createLocationService(module);
      const state = await service.checkPermission();
      expect(state).toBe("blocked");
    });

    it("returns undetermined when permission is undetermined", async () => {
      const module = createMockLocationModule({
        getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
          status: ExpoLocation.PermissionStatus.UNDETERMINED,
          granted: false,
          canAskAgain: true,
          expires: "never",
        }),
      });
      const service = createLocationService(module);
      const state = await service.checkPermission();
      expect(state).toBe("undetermined");
    });
  });

  describe("requestPermission", () => {
    it("requests permission and returns granted", async () => {
      const module = createMockLocationModule();
      const service = createLocationService(module);
      const state = await service.requestPermission();
      expect(state).toBe("granted");
      expect(module.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it("returns services_disabled if services are turned off", async () => {
      const module = createMockLocationModule({
        hasServicesEnabledAsync: jest.fn().mockResolvedValue(false),
      });
      const service = createLocationService(module);
      const state = await service.requestPermission();
      expect(state).toBe("services_disabled");
      expect(module.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe("getCurrentPosition", () => {
    it("returns coordinates on valid GPS fix", async () => {
      const module = createMockLocationModule();
      const service = createLocationService(module);
      const position = await service.getCurrentPosition();
      expect(position.latitude).toBeCloseTo(14.5547);
      expect(position.longitude).toBeCloseTo(121.0244);
      expect(position.accuracy).toBe(15);
      expect(position.timestamp).toBe(1729864800000);
    });

    it("throws if location services are disabled", async () => {
      const module = createMockLocationModule({
        hasServicesEnabledAsync: jest.fn().mockResolvedValue(false),
      });
      const service = createLocationService(module);
      await expect(service.getCurrentPosition()).rejects.toThrow(
        "Device location services are disabled",
      );
    });

    it("throws if permission is not granted", async () => {
      const module = createMockLocationModule({
        getForegroundPermissionsAsync: jest.fn().mockResolvedValue({
          status: ExpoLocation.PermissionStatus.DENIED,
          granted: false,
          canAskAgain: true,
          expires: "never",
        }),
      });
      const service = createLocationService(module);
      await expect(service.getCurrentPosition()).rejects.toThrow(
        "Foreground location permission not granted",
      );
    });

    it("throws timeout error when position fix exceeds timeout", async () => {
      const module = createMockLocationModule({
        getCurrentPositionAsync: jest.fn().mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    coords: {
                      latitude: 0,
                      longitude: 0,
                      accuracy: null,
                      altitude: null,
                      altitudeAccuracy: null,
                      heading: null,
                      speed: null,
                    },
                    timestamp: Date.now(),
                  }),
                200,
              ),
            ),
        ),
      });
      const service = createLocationService(module);
      await expect(
        service.getCurrentPosition({ timeoutMs: 50 }),
      ).rejects.toThrow("Location request timed out after 50ms");
    });
  });
});
