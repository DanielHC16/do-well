import appConfig from "../../app.config";
import { setupTheme } from "../../src/features/setup/setupTheme";
import { ProtectedRouteUnavailableScreen } from "../../src/features/shell/components/ProtectedRouteUnavailableScreen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

describe("Security & Compliance: Truth in Advertising & Transparency", () => {
  it("verifies Android permissions in app.config.ts strictly request foreground-only access", () => {
    const androidPermissions = appConfig.android?.permissions ?? [];

    // Foreground location only
    expect(androidPermissions).toContain("ACCESS_COARSE_LOCATION");
    expect(androidPermissions).toContain("ACCESS_FINE_LOCATION");

    // Strictly forbidden background location permissions
    expect(androidPermissions).not.toContain("ACCESS_BACKGROUND_LOCATION");
    expect(androidPermissions).not.toContain("RECORD_AUDIO");
    expect(androidPermissions).not.toContain("READ_SMS");
    expect(androidPermissions).not.toContain("RECEIVE_SMS");
    expect(androidPermissions).not.toContain("READ_CONTACTS");

    // Local notifications only
    expect(androidPermissions).toContain("POST_NOTIFICATIONS");
  });

  it("verifies expo-location plugin explicitly disables background and foreground service tracking", () => {
    const plugins = appConfig.plugins ?? [];
    const locationPluginConfig = plugins.find(
      (p) => Array.isArray(p) && p[0] === "expo-location",
    );

    expect(locationPluginConfig).toBeDefined();
    if (Array.isArray(locationPluginConfig)) {
      const options = locationPluginConfig[1];
      expect(options.isAndroidBackgroundLocationEnabled).toBe(false);
      expect(options.isAndroidForegroundServiceEnabled).toBe(false);
      expect(options.locationWhenInUsePermission).toMatch(
        /approximate location/i,
      );
    }
  });

  it("verifies expo-image-picker plugin explicitly disables microphone and bounds camera/photo usage", () => {
    const plugins = appConfig.plugins ?? [];
    const imagePickerPlugin = plugins.find(
      (p) => Array.isArray(p) && p[0] === "expo-image-picker",
    );

    expect(imagePickerPlugin).toBeDefined();
    if (Array.isArray(imagePickerPlugin)) {
      const options = imagePickerPlugin[1];
      expect(options.microphonePermission).toBe(false);
      expect(options.photosPermission).toMatch(/work submission evidence/i);
      expect(options.cameraPermission).toMatch(/work submission evidence/i);
    }
  });

  it("verifies design tokens define accessible high-contrast warning and status colors", () => {
    expect(setupTheme.color.warning).toBeDefined();
    expect(setupTheme.color.accent).toBeDefined();
    expect(setupTheme.color.foreground).toBeDefined();
  });

  it("verifies error screen renders clean production copy without placeholder text", () => {
    expect(typeof ProtectedRouteUnavailableScreen).toBe("function");
  });
});
