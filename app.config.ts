import type { ExpoConfig } from "expo/config";

const appConfig: ExpoConfig = {
  name: "Do Well",
  slug: "do-well",
  version: "0.1.0",
  scheme: "dowell",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  android: {
    package: "com.anghulingpullrequest.dowell",
    predictiveBackGestureEnabled: false,
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
  },
  web: {
    output: "static",
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        android: {
          cmakeVersion: "3.31.6",
        },
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Do Well uses your approximate location to show nearby gigs in your community.",
        isAndroidBackgroundLocationEnabled: false,
        isAndroidForegroundServiceEnabled: false,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default appConfig;
