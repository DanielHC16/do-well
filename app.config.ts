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
  ],
  experiments: {
    typedRoutes: true,
  },
};

export default appConfig;
