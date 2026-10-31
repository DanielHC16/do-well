// Official mock: provides zero insets so components using useSafeAreaInsets
// render without a native SafeAreaProvider in unit tests.
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
