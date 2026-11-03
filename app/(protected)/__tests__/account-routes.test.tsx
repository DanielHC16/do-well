import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useAuth } from "@/features/auth/context/useAuth";
import { adminGateway } from "@/features/admin/data/admin-gateway";
import { accountGateway } from "@/features/settings/data/account-gateway";

import AdminRoute from "../admin";
import SettingsRoute from "../settings";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("@/features/auth/context/useAuth", () => ({
  ...jest.requireActual("@/features/auth/context/useAuth"),
  useAuth: jest.fn(),
}));
jest.mock("@/features/settings/data/account-gateway", () => ({
  accountGateway: { getCapabilities: jest.fn(), setPreferredMode: jest.fn() },
}));
jest.mock("@/features/admin/data/admin-gateway", () => ({
  adminGateway: {
    getAdminOverview: jest.fn(),
    listAdminReports: jest.fn(),
    resolveReport: jest.fn(),
  },
}));
jest.mock("@/features/shell/context/useShellMode", () => ({
  useShellMode: () => ({
    mode: "worker",
    busy: false,
    error: null,
    switchMode: jest.fn(async () => true),
  }),
}));

const userId = "80000000-0000-4000-8000-000000000001";
const capabilities = {
  userId,
  preferredMode: "worker" as const,
  isAdmin: false,
};

describe("account routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      state: {
        route: "ready",
        status: "idle",
        userId,
        profile: {
          id: userId,
          displayName: "Demo Member",
          homeArea: "Makati",
          onboardingCompletedAt: "2026-10-26T00:00:00.000Z",
        },
        error: null,
        operationId: 1,
      },
      signOut: jest.fn(),
      refresh: jest.fn(),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      beginGoogleSignIn: jest.fn(),
      exchangeCode: jest.fn(),
      resendConfirmation: jest.fn(),
      requestPasswordReset: jest.fn(),
      updatePassword: jest.fn(),
      completeOnboarding: jest.fn(),
    });
    jest.mocked(accountGateway.getCapabilities).mockResolvedValue(capabilities);
    jest.mocked(accountGateway.setPreferredMode).mockResolvedValue(undefined);
    jest.mocked(adminGateway.getAdminOverview).mockResolvedValue({
      profiles: 12,
      openReports: 0,
      publishedGigs: 7,
      activeAssignments: 3,
    });
    jest.mocked(adminGateway.listAdminReports).mockResolvedValue([]);
  });

  it("opens the settings destination and saves through the authenticated account gateway", async () => {
    const view = await render(<SettingsRoute />);
    expect(
      await view.findByRole("header", { name: "Account settings" }),
    ).toBeVisible();
    await fireEvent.press(
      view.getByRole("radio", { name: "Use Offer work by default" }),
    );
    await waitFor(() =>
      expect(accountGateway.setPreferredMode).toHaveBeenCalledWith(
        userId,
        "employer",
      ),
    );
  });

  it("denies a direct admin link without querying protected admin data", async () => {
    const view = await render(<AdminRoute />);
    expect(
      await view.findByRole("header", { name: "Admin access required" }),
    ).toBeVisible();
    expect(adminGateway.getAdminOverview).not.toHaveBeenCalled();
    expect(adminGateway.listAdminReports).not.toHaveBeenCalled();
  });

  it("allows only a server-confirmed admin to load the existing console", async () => {
    jest
      .mocked(accountGateway.getCapabilities)
      .mockResolvedValue({ ...capabilities, isAdmin: true });
    const view = await render(<AdminRoute />);
    expect(await view.findByText("No open reports")).toBeVisible();
    expect(adminGateway.getAdminOverview).toHaveBeenCalledTimes(1);
  });

  it("fails closed on capability errors and supports an explicit retry", async () => {
    jest
      .mocked(accountGateway.getCapabilities)
      .mockRejectedValueOnce(new Error("Denied"));
    const view = await render(<AdminRoute />);
    expect(
      await view.findByRole("button", { name: "Try again" }),
    ).toBeVisible();
    expect(adminGateway.getAdminOverview).not.toHaveBeenCalled();
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    expect(
      await view.findByRole("header", { name: "Admin access required" }),
    ).toBeVisible();
    expect(accountGateway.getCapabilities).toHaveBeenCalledTimes(2);
  });

  it("discards the previous account's admin view while another account is being verified", async () => {
    jest
      .mocked(accountGateway.getCapabilities)
      .mockResolvedValueOnce({ ...capabilities, isAdmin: true });
    const view = await render(<AdminRoute />);
    expect(await view.findByText("No open reports")).toBeVisible();
    const auth = useAuth();
    const nextUserId = "80000000-0000-4000-8000-000000000002";
    jest.mocked(useAuth).mockReturnValue({
      ...auth,
      state: {
        ...auth.state,
        userId: nextUserId,
        profile: {
          id: nextUserId,
          displayName: "Another Member",
          homeArea: "Makati",
          onboardingCompletedAt: "2026-10-26T00:00:00.000Z",
        },
      },
    });
    jest
      .mocked(accountGateway.getCapabilities)
      .mockReturnValue(new Promise<typeof capabilities>(() => undefined));

    await view.rerender(<AdminRoute />);

    expect(view.queryByText("No open reports")).toBeNull();
    expect(adminGateway.getAdminOverview).toHaveBeenCalledTimes(1);
    expect(accountGateway.getCapabilities).toHaveBeenLastCalledWith(nextUserId);
  });
});
