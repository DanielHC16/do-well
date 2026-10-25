import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text } from "react-native";

import { ShellModeProvider } from "../ShellModeProvider";
import { useShellMode } from "../useShellMode";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

function Probe() {
  const { busy, error, mode, switchMode } = useShellMode();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => void switchMode("employer")}
    >
      <Text>{`${mode}:${busy ? "busy" : "idle"}:${error ?? "none"}`}</Text>
    </Pressable>
  );
}

function createStore() {
  return {
    read: jest.fn(async () => "worker" as const),
    save: jest.fn(async () => undefined),
  };
}

describe("ShellModeProvider", () => {
  it("loads and persists the presentation mode for the current user", async () => {
    const store = createStore();
    const view = await render(
      <ShellModeProvider store={store} userId="user-a">
        <Probe />
      </ShellModeProvider>,
    );

    await waitFor(() =>
      expect(view.getByText("worker:idle:none")).toBeVisible(),
    );
    await fireEvent.press(view.getByRole("button"));

    await waitFor(() =>
      expect(view.getByText("employer:idle:none")).toBeVisible(),
    );
    expect(store.save).toHaveBeenCalledWith("user-a", "employer");
  });

  it("shows a safe retry state when local preferences cannot load", async () => {
    const store = createStore();
    store.read
      .mockRejectedValueOnce(new Error("private storage detail"))
      .mockResolvedValueOnce("worker");
    const view = await render(
      <ShellModeProvider store={store} userId="user-a">
        <Probe />
      </ShellModeProvider>,
    );

    expect(
      await view.findByText("Your workspace preference is unavailable."),
    ).toBeVisible();
    expect(view.queryByText("private storage detail")).toBeNull();

    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(view.getByText("worker:idle:none")).toBeVisible(),
    );
  });
});
