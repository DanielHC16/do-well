import { useEffect } from "react";

/** Keep Expo's development-only floating gear from covering app header actions. */
export function DevelopmentToolsPresentation() {
  useEffect(() => {
    if (__DEV__) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- Keep optional native dev tooling out of release imports.
        const devClient: typeof import("expo-dev-client") = require("expo-dev-client");
        devClient.setToolsButtonVisible(false);
      } catch {
        // Optional tooling must not block the app on a non-development binary.
      }
    }
  }, []);
  return null;
}
