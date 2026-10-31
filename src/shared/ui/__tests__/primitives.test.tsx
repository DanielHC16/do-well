import { fireEvent, render } from "@testing-library/react-native";

import {
  AppButton,
  AppInput,
  ConfirmationModal,
  EmptyState,
  ErrorState,
} from "..";

describe("marketplace UI primitives", () => {
  it.each(["discovery", "employer", "work", "activity"] as const)(
    "keeps the %s empty-state action labelled and working",
    async (kind) => {
      const action = jest.fn();
      const view = await render(
        <EmptyState
          kind={kind}
          title="Nothing here yet"
          message="Choose your next step."
          actionLabel="Continue"
          onAction={action}
        />,
      );
      expect(
        view.getByRole("header", { name: "Nothing here yet" }),
      ).toBeVisible();
      expect(view.getByText("Choose your next step.")).toBeVisible();
      await fireEvent.press(view.getByRole("button", { name: "Continue" }));
      expect(action).toHaveBeenCalledTimes(1);
    },
  );

  it("omits an empty-state action when no operation is available", async () => {
    const view = await render(
      <EmptyState
        title="All caught up"
        message="Updates will appear here."
        actionLabel="Unavailable"
      />,
    );
    expect(view.queryByRole("button")).toBeNull();
  });
  it("blocks a busy action and communicates its state to assistive technology", async () => {
    const action = jest.fn();
    const view = await render(
      <AppButton label="Publish gig" onPress={action} loading />,
    );
    const button = view.getByRole("button", { name: "Publish gig" });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState.busy).toBe(true);
    await fireEvent.press(button);
    expect(action).not.toHaveBeenCalled();
  });

  it("labels an input and announces its validation error", async () => {
    const view = await render(
      <AppInput label="Gig title" error="Enter a title" />,
    );
    expect(view.getByLabelText("Gig title")).toBeVisible();
    expect(view.getByRole("alert")).toHaveTextContent("Enter a title");
  });

  it("keeps retry available when a request fails", async () => {
    const retry = jest.fn();
    const view = await render(
      <ErrorState message="Could not load gigs." onRetry={retry} />,
    );
    await fireEvent.press(view.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("prevents cancelling or repeating a confirmation during submission", async () => {
    const confirm = jest.fn();
    const cancel = jest.fn();
    const view = await render(
      <ConfirmationModal
        visible
        title="Select worker?"
        message="Review the applicant first."
        confirmLabel="Select worker"
        onConfirm={confirm}
        onCancel={cancel}
        busy
      />,
    );
    expect(view.getByRole("button", { name: "Select worker" })).toBeDisabled();
    expect(view.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await fireEvent.press(view.getByRole("button", { name: "Select worker" }));
    await fireEvent.press(view.getByRole("button", { name: "Cancel" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });
});
