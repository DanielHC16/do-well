import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { createAuthError } from "../../model/auth-errors";
import { GoogleSignInScreen } from "../GoogleSignInScreen";

describe("GoogleSignInScreen", () => {
  it("provides an accessible Google sign-in action and prevents duplicate submits", async () => {
    let finish: (() => void) | undefined;
    const onSignIn = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const screen = await render(<GoogleSignInScreen onSignIn={onSignIn} />);
    const button = screen.getByRole("button", { name: "Continue with Google" });

    await fireEvent.press(button);
    await fireEvent.press(button);

    expect(onSignIn).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    await act(async () => {
      finish?.();
    });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("renders only stable safe errors and supports retry", async () => {
    const onSignIn = jest
      .fn(async () => undefined)
      .mockRejectedValueOnce(createAuthError("AUTH_PROVIDER_DENIED"))
      .mockResolvedValueOnce(undefined);
    const screen = await render(<GoogleSignInScreen onSignIn={onSignIn} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );
    expect(
      await screen.findByText("The identity provider did not approve sign-in."),
    ).toBeVisible();

    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(onSignIn).toHaveBeenCalledTimes(2));
  });

  it("treats browser cancellation as a neutral retry state", async () => {
    const onSignIn = jest
      .fn(async () => undefined)
      .mockRejectedValueOnce(createAuthError("AUTH_CANCELLED"));
    const screen = await render(<GoogleSignInScreen onSignIn={onSignIn} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Continue with Google" }),
    );

    expect(await screen.findByText("Sign-in was cancelled.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});
