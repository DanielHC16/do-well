import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

import { OnboardingForm } from "../OnboardingForm";

function deferredPromise() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return {
    promise,
    resolve: () => resolve?.(),
  };
}

describe("OnboardingForm", () => {
  afterEach(async () => cleanup());

  it("shows accessible field errors and does not submit missing values", async () => {
    const onSubmit = jest.fn(async () => undefined);
    const view = await render(<OnboardingForm onSubmit={onSubmit} />);

    await fireEvent.press(view.getByRole("button", { name: "Continue" }));

    expect(
      await view.findByText("Enter a name with at least 2 characters."),
    ).toBeVisible();
    expect(view.getByText("Enter your city or public area.")).toBeVisible();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits normalized profile values only once while the RPC is pending", async () => {
    const pending = deferredPromise();
    const onSubmit = jest.fn(() => pending.promise);
    const view = await render(<OnboardingForm onSubmit={onSubmit} />);

    await fireEvent.changeText(
      view.getByLabelText("Display name"),
      "  Ada Lovelace  ",
    );
    await fireEvent.changeText(
      view.getByLabelText("City or public area"),
      "  Makati City  ",
    );
    await fireEvent.press(view.getByRole("radio", { name: "Offer work" }));
    await fireEvent.press(view.getByRole("button", { name: "Continue" }));
    await fireEvent.press(view.getByRole("button", { name: "Saving profile" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      displayName: "Ada Lovelace",
      homeArea: "Makati City",
      preferredMode: "employer",
    });
    expect(view.getByRole("button", { name: "Saving profile" })).toBeDisabled();

    pending.resolve();
    await waitFor(() =>
      expect(view.getByRole("button", { name: "Continue" })).toBeEnabled(),
    );
  });

  it("shows a stable RPC failure and allows an idempotent retry", async () => {
    const onSubmit = jest
      .fn<
        Promise<void>,
        [
          {
            displayName: string;
            homeArea: string;
            preferredMode: "worker" | "employer";
          },
        ]
      >()
      .mockRejectedValueOnce(new Error("sensitive vendor response"))
      .mockResolvedValueOnce(undefined);
    const view = await render(<OnboardingForm onSubmit={onSubmit} />);

    await fireEvent.changeText(view.getByLabelText("Display name"), "Ada");
    await fireEvent.changeText(
      view.getByLabelText("City or public area"),
      "Makati",
    );
    await fireEvent.press(view.getByRole("button", { name: "Continue" }));

    expect(
      await view.findByRole("alert", {
        name: "We couldn't save your profile. Check your connection and try again.",
      }),
    ).toBeVisible();
    expect(view.queryByText("sensitive vendor response")).toBeNull();

    await fireEvent.press(view.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit).toHaveBeenNthCalledWith(2, {
      displayName: "Ada",
      homeArea: "Makati",
      preferredMode: "worker",
    });
  });
});
