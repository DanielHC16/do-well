import type { ExpoConfig } from "expo/config";

const appConfig: ExpoConfig = {
  name: "Do Well",
  slug: "do-well",
  version: "0.1.0",
  icon: "./branding/do-well-app-logo.png",
  scheme: "dowell",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  android: {
    package: "com.anghulingpullrequest.dowell",
    adaptiveIcon: {
      foregroundImage: "./branding/do-well-adaptive-foreground.png",
      backgroundColor: "#FFFFFF",
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      "ACCESS_COARSE_LOCATION",
      "ACCESS_FINE_LOCATION",
      "POST_NOTIFICATIONS",
    ],
  },
  web: {
    output: "static",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./branding/do-well-app-logo.png",
        imageWidth: 160,
        resizeMode: "contain",
        backgroundColor: "#FFFFFF",
      },
    ],
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
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow Do Well to access your photos for work submission evidence.",
        cameraPermission:
          "Allow Do Well to take photos for work submission evidence.",
        microphonePermission: false,
      },
    ],
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default appConfig;
