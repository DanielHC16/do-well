import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { AccountAccessScreen } from "../AccountAccessScreen";

describe("AccountAccessScreen", () => {
  afterEach(async () => cleanup());

  it("signs in with Google", async () => {
    const onGoogleSignIn = jest.fn(async () => undefined);
    const view = await render(
      <AccountAccessScreen
        onGoogleSignIn={onGoogleSignIn}
        onPasswordSignIn={jest.fn()}
        onSignUp={jest.fn()}
      />,
    );

    await fireEvent.press(
      view.getByRole("button", { name: "Continue with Google" }),
    );

    await waitFor(() => {
      expect(onGoogleSignIn).toHaveBeenCalledTimes(1);
      expect(
        view.getByRole("button", { name: "Continue with Google" }),
      ).not.toBeDisabled();
    });
  });

  it("creates an employer account with validated credentials", async () => {
    const onSignUp = jest.fn(async () => undefined);
    const view = await render(
      <AccountAccessScreen
        onGoogleSignIn={jest.fn()}
        onPasswordSignIn={jest.fn()}
        onSignUp={onSignUp}
      />,
    );

    await fireEvent.press(
      view.getByRole("button", { name: "Create an account" }),
    );
    await fireEvent.changeText(view.getByLabelText("Display name"), "Daniel");
    await fireEvent.changeText(
      view.getByLabelText("Email address"),
      "owner@example.com",
    );
    await fireEvent.changeText(
      view.getByLabelText("Password"),
      "SecurePass123",
    );
    await fireEvent.press(view.getByRole("radio", { name: "Offer work" }));
    await fireEvent.press(view.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(onSignUp).toHaveBeenCalledWith(
        "owner@example.com",
        "SecurePass123",
        "Daniel",
        "employer",
      ),
    );
    expect(
      await view.findByText(
        "Check your email to finish creating your account.",
      ),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        view.getByRole("button", { name: "Create account" }),
      ).not.toBeDisabled(),
    );
  });

  it("signs in with email and password", async () => {
    const onPasswordSignIn = jest.fn(async () => undefined);
    const view = await render(
      <AccountAccessScreen
        onGoogleSignIn={jest.fn()}
        onPasswordSignIn={onPasswordSignIn}
        onSignUp={jest.fn()}
      />,
    );

    await fireEvent.changeText(
      view.getByLabelText("Email address"),
      "user@example.com",
    );
    await fireEvent.changeText(
      view.getByLabelText("Password"),
      "SecurePass123",
    );
    await fireEvent.press(view.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(onPasswordSignIn).toHaveBeenCalledWith(
        "user@example.com",
        "SecurePass123",
      ),
    );
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Sign in" })).not.toBeDisabled(),
    );
  });
});
