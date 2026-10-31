import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { AccountAccessScreen } from "../AccountAccessScreen";

describe("AccountAccessScreen", () => {
  afterEach(async () => cleanup());

  it("lets users reveal the password and review a skippable introduction", async () => {
    const view = await render(
      <AccountAccessScreen
        onGoogleSignIn={jest.fn()}
        onPasswordSignIn={jest.fn()}
        onSignUp={jest.fn()}
      />,
    );
    expect(view.getByLabelText("Password").props.secureTextEntry).toBe(true);
    await fireEvent.press(view.getByRole("button", { name: "Show password" }));
    expect(view.getByLabelText("Password").props.secureTextEntry).toBe(false);
    await fireEvent.press(
      view.getByRole("button", { name: "How Do Well works" }),
    );
    expect(view.getByText("Discover flexible paid gigs")).toBeVisible();
    await fireEvent.press(view.getByRole("button", { name: "Continue" }));
    expect(view.getByText("Find help for short-term tasks")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: "Skip introduction" }),
    );
    expect(view.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

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

    await fireEvent.press(view.getByRole("tab", { name: "Create an account" }));
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

  it("shows compact sign-in and sign-up headings above an immediately available form", async () => {
    const view = await render(
      <AccountAccessScreen
        onGoogleSignIn={jest.fn()}
        onPasswordSignIn={jest.fn()}
        onSignUp={jest.fn()}
      />,
    );
    expect(view.getByRole("header", { name: "Welcome back" })).toBeVisible();
    expect(view.getByLabelText("Email address")).toBeVisible();
    expect(
      view.getByRole("tab", { name: "I already have an account" }).props
        .accessibilityState.selected,
    ).toBe(true);
    await fireEvent.press(view.getByRole("tab", { name: "Create an account" }));
    expect(
      view.getByRole("header", { name: "Create your account" }),
    ).toBeVisible();
    expect(view.getByLabelText("Display name")).toBeVisible();
  });

  it("locks all access methods while email sign-in is pending and keeps its action visible", async () => {
    let finish: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const onPasswordSignIn = jest.fn(() => pending);
    const onGoogleSignIn = jest.fn();
    const view = await render(
      <AccountAccessScreen
        onGoogleSignIn={onGoogleSignIn}
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
    expect(view.getByRole("button", { name: "Sign in" })).toHaveTextContent(
      "Sign in",
    );
    expect(
      view.getByRole("button", { name: "Continue with Google" }),
    ).toBeDisabled();
    expect(view.getByRole("tab", { name: "Create an account" })).toBeDisabled();
    await fireEvent.press(
      view.getByRole("button", { name: "Continue with Google" }),
    );
    await fireEvent.press(view.getByRole("button", { name: "Sign in" }));
    expect(onGoogleSignIn).not.toHaveBeenCalled();
    expect(onPasswordSignIn).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Sign in" })).not.toBeDisabled(),
    );
  });

  it("keeps credentials after failure and clears feedback when switching modes", async () => {
    const onPasswordSignIn = jest.fn(async () => {
      throw new Error("private vendor details");
    });
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
    await waitFor(() => expect(view.getByRole("alert")).toBeVisible());
    expect(view.queryByText("private vendor details")).toBeNull();
    expect(view.getByLabelText("Email address")).toHaveDisplayValue(
      "user@example.com",
    );
    expect(view.getByLabelText("Password")).toHaveDisplayValue("SecurePass123");
    await fireEvent.press(view.getByRole("tab", { name: "Create an account" }));
    expect(view.queryByRole("alert")).toBeNull();
    expect(view.getByLabelText("Email address")).toHaveDisplayValue(
      "user@example.com",
    );
    await fireEvent.press(
      view.getByRole("tab", { name: "I already have an account" }),
    );
    expect(view.getByLabelText("Password")).toHaveDisplayValue("SecurePass123");
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
