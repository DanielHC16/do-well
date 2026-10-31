import { render } from "@testing-library/react-native";
import { useFonts } from "expo-font";
import { Text, TextInput, TypographyProvider } from "../Typography";

jest.mock("expo-font", () => ({ useFonts: jest.fn() }));
const mockFonts = jest.mocked(useFonts);

describe("bundled typography", () => {
  it("waits for local fonts before mounting route content", async () => {
    mockFonts.mockReturnValue([false, null]);
    const view = await render(
      <TypographyProvider>
        <Text>Route content</Text>
      </TypographyProvider>,
    );
    expect(view.queryByText("Route content")).toBeNull();
    expect(view.getByLabelText("Loading Do Well")).toBeVisible();
  });

  it("maps semantic weights to loaded Inter faces and preserves input props", async () => {
    mockFonts.mockReturnValue([true, null]);
    const view = await render(
      <TypographyProvider>
        <Text style={{ fontWeight: "700" }}>Heading</Text>
        <TextInput
          accessibilityLabel="Name"
          value="Jordan"
          style={{ fontWeight: "500" }}
        />
      </TypographyProvider>,
    );
    expect(view.getByText("Heading")).toHaveStyle({
      fontFamily: "InterBold",
      fontWeight: "normal",
    });
    expect(view.getByLabelText("Name")).toHaveStyle({
      fontFamily: "InterMedium",
      fontWeight: "normal",
    });
    expect(view.getByDisplayValue("Jordan")).toBeVisible();
  });

  it("keeps content usable with native fonts when loading fails", async () => {
    mockFonts.mockReturnValue([false, new Error("font unavailable")]);
    const view = await render(
      <TypographyProvider>
        <Text style={{ fontWeight: "700" }}>Fallback</Text>
      </TypographyProvider>,
    );
    expect(view.getByText("Fallback")).toHaveStyle({ fontWeight: "700" });
  });
});
