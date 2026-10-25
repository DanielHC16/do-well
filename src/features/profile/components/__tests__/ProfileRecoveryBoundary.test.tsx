import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { useAuth } from "@/features/auth/context/useAuth";
import { ProfileRecoveryBoundary } from "../ProfileRecoveryBoundary";

jest.mock("@/features/auth/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);

describe("ProfileRecoveryBoundary", () => {
  afterEach(async () => cleanup());

  it("renders recovery state with honest message and no fabricated name", async () => {
    const mockRefresh = jest.fn(async () => undefined);
    const mockSignOut = jest.fn(async () => undefined);

    mockedUseAuth.mockReturnValue({
      refresh: mockRefresh,
      signOut: mockSignOut,
      state: {
        status: "idle",
        route: "ready",
        userId: "user-123",
        profile: null,
        error: null,
        operationId: 1,
      },
    } as any);

    const view = await render(<ProfileRecoveryBoundary />);

    expect(view.getByText("Profile temporarily unavailable")).toBeTruthy();
    expect(view.queryByText("Neighbor")).toBeNull();
    expect(view.getByText("Refresh Profile")).toBeTruthy();
    expect(view.getByText("Sign Out")).toBeTruthy();

    await fireEvent.press(view.getByText("Refresh Profile"));
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    await fireEvent.press(view.getByText("Sign Out"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
