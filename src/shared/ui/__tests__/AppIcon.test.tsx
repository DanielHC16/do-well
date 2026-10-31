import { render } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";
import { AppIcon } from "../AppIcon";

jest.mock("expo-symbols", () => ({
  SymbolView: jest.fn(() => null),
}));

describe("AppIcon", () => {
  it("maps semantic icons to Android and iOS symbols without duplicating control labels", async () => {
    await render(<AppIcon name="briefcase" />);
    const props = jest.mocked(SymbolView).mock.calls[0][0];
    expect(props.name).toEqual({
      ios: "briefcase",
      android: "work",
      web: "work",
    });
    expect(props.accessibilityElementsHidden).toBe(true);
    expect(props.importantForAccessibility).toBe("no-hide-descendants");
  });
});
