import { fireEvent, render } from "@testing-library/react-native";

import { createAuthError } from "../../model/auth-errors";
import { GoogleCallbackScreen } from "../GoogleCallbackScreen";

describe("GoogleCallbackScreen", () => {
  it("offers an accessible return to sign-in after a callback failure", async () => {
    const onReturnToSignIn = jest.fn();

    const view = await render(
      <GoogleCallbackScreen
        error={createAuthError("AUTH_INVALID_CALLBACK")}
        onReturnToSignIn={onReturnToSignIn}
      />,
    );

    expect(view.getByRole("alert")).toHaveTextContent(
      "The sign-in callback is invalid.",
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Return to sign in" }),
    );
    expect(onReturnToSignIn).toHaveBeenCalledTimes(1);
  });
});
