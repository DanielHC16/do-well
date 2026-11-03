import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { DemoSettingsScreen } from "../DemoSettingsScreen";

const mockSwitchPersona = jest.fn(async () => undefined);
const mockReset = jest.fn(async () => undefined);
const mockReplace = jest.fn();
let mockBusy = false;

jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: { activePersona: "employer" },
    busy: mockBusy,
    error: null,
    switchPersona: mockSwitchPersona,
    reset: mockReset,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

describe("DemoSettingsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBusy = false;
  });

  it("switches accounts from Settings without presentation copy", async () => {
    const view = await render(<DemoSettingsScreen />);
    expect(view.getAllByText("Maya Santos")[0]).toBeVisible();
    expect(view.queryByText(/demo|synthetic|presenter/i)).toBeNull();
    await fireEvent.press(
      view.getByRole("radio", { name: "Alex Reyes, Worker" }),
    );
    await waitFor(() =>
      expect(mockSwitchPersona).toHaveBeenCalledWith("worker"),
    );
    expect(mockReset).not.toHaveBeenCalled();
  });

  it("disables account changes while saving", async () => {
    mockBusy = true;
    const view = await render(<DemoSettingsScreen />);
    expect(
      view.getByRole("radio", { name: "Alex Reyes, Worker" }),
    ).toBeDisabled();
  });

  it("requires confirmation before clearing progress", async () => {
    const alert = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => undefined);
    const view = await render(<DemoSettingsScreen />);
    await fireEvent.press(
      view.getByRole("button", { name: "Reset workspace" }),
    );
    expect(mockReset).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      "Reset workspace?",
      expect.stringContaining("progress"),
      expect.any(Array),
    );
    const confirm = alert.mock.calls[0][2]?.find(
      (button) => button.text === "Reset",
    );
    confirm?.onPress?.();
    await waitFor(() => expect(mockReset).toHaveBeenCalledTimes(1));
    alert.mockRestore();
  });
});
