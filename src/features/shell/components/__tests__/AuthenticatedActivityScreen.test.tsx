import { render } from "@testing-library/react-native";

import { AuthenticatedActivityScreen } from "../AuthenticatedActivityScreen";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
    busy: false,
    error: null,
    switchMode: jest.fn(async () => true),
    retry: jest.fn(async () => undefined),
  }),
}));

describe("AuthenticatedActivityScreen", () => {
  it("renders the shared audit trail empty notice", async () => {
    const view = await render(<AuthenticatedActivityScreen />);

    expect(view.getByText("Nothing gets lost in the handoff.")).toBeVisible();
    expect(view.getByText("No activity yet")).toBeVisible();
    expect(view.getByText("RECENT ACTIVITY")).toBeVisible();
  });
});
