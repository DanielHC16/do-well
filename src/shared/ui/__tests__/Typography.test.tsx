import { render } from "@testing-library/react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { Text, TextInput, TypographyProvider } from "../Typography";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve(true)),
}));
const mockFonts = jest.mocked(useFonts);
const mockHide = jest.mocked(SplashScreen.hideAsync);

describe("bundled typography", () => {
  beforeEach(() => mockHide.mockClear());

  it("keeps the native splash up and mounts nothing until fonts settle", async () => {
    mockFonts.mockReturnValue([false, null]);
    const view = await render(
      <TypographyProvider>
        <Text>Route content</Text>
      </TypographyProvider>,
    );
    expect(view.queryByText("Route content")).toBeNull();
    expect(mockHide).not.toHaveBeenCalled();
  });

  it("maps semantic weights to loaded Outfit faces and hides the splash", async () => {
    mockFonts.mockReturnValue([true, null]);
    const view = await render(
      <TypographyProvider>
        <Text style={{ fontWeight: "700" }}>Heading</Text>
        <Text style={{ fontWeight: "600" }}>Title</Text>
        <TextInput
          accessibilityLabel="Name"
          value="Jordan"
          style={{ fontWeight: "500" }}
        />
      </TypographyProvider>,
    );
    expect(view.getByText("Heading")).toHaveStyle({
      fontFamily: "OutfitBold",
      fontWeight: "normal",
    });
    expect(view.getByText("Title")).toHaveStyle({
      fontFamily: "OutfitSemiBold",
    });
    expect(view.getByLabelText("Name")).toHaveStyle({
      fontFamily: "OutfitMedium",
      fontWeight: "normal",
    });
    expect(view.getByDisplayValue("Jordan")).toBeVisible();
    expect(mockHide).toHaveBeenCalled();
  });

  it("keeps content usable with native fonts when loading fails", async () => {
    mockFonts.mockReturnValue([false, new Error("font unavailable")]);
    const view = await render(
      <TypographyProvider>
        <Text style={{ fontWeight: "700" }}>Fallback</Text>
      </TypographyProvider>,
    );
    expect(view.getByText("Fallback")).toHaveStyle({ fontWeight: "700" });
    expect(mockHide).toHaveBeenCalled();
  });
});
