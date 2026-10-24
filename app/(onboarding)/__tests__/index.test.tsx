import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useAuth } from "@/features/auth/context/useAuth";

import OnboardingScreen from "../index";

jest.mock("@/features/auth/context/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockedUseAuth = jest.mocked(useAuth);

describe("OnboardingScreen", () => {
  it("uses the authenticated provider to complete onboarding", async () => {
    const completeOnboarding = jest.fn(async () => undefined);
    mockedUseAuth.mockReturnValue({
      state: {
        route: "needsOnboarding",
        status: "idle",
        userId: "user-a",
        profile: {
          id: "user-a",
          displayName: "New user",
          homeArea: null,
          onboardingCompletedAt: null,
        },
        error: null,
        operationId: 1,
      },
      completeOnboarding,
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      beginGoogleSignIn: jest.fn(),
      exchangeCode: jest.fn(),
      resendConfirmation: jest.fn(),
      requestPasswordReset: jest.fn(),
      updatePassword: jest.fn(),
      refresh: jest.fn(),
      signOut: jest.fn(),
    });
    const view = await render(<OnboardingScreen />);

    expect(view.getByLabelText("Display name")).toHaveDisplayValue("");
    await fireEvent.changeText(view.getByLabelText("Display name"), "Ada");
    await fireEvent.changeText(
      view.getByLabelText("City or public area"),
      "Makati",
    );
    await fireEvent.press(view.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith("Ada", "Makati"),
    );
  });
});
