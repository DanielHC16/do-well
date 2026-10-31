import { fireEvent, render, within } from "@testing-library/react-native";

import { ConfirmationModal } from "..";

describe("ConfirmationModal", () => {
  it("keeps long confirmation content and both actions inside a bounded scroll area", async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    const view = await render(
      <ConfirmationModal
        visible
        title="Review this worker selection"
        message={"Review the proposed work and applicant before selecting. ".repeat(
          30,
        )}
        confirmLabel="Confirm selection"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    const scroll = view.getByTestId("confirmation-scroll");
    expect(view.getByTestId("confirmation-dialog")).toHaveStyle({
      maxHeight: "100%",
    });
    await fireEvent.press(
      within(scroll).getByRole("button", { name: "Confirm selection" }),
    );
    await fireEvent.press(
      within(scroll).getByRole("button", { name: "Cancel" }),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("respects the pending action when Android requests dismissal", async () => {
    const onCancel = jest.fn();
    const props = {
      visible: true,
      title: "Select worker?",
      message: "Confirm this selection.",
      confirmLabel: "Confirm selection",
      onConfirm: jest.fn(),
      onCancel,
    };
    const view = await render(<ConfirmationModal {...props} busy />);
    await fireEvent(view.getByTestId("confirmation-modal"), "requestClose");
    expect(onCancel).not.toHaveBeenCalled();
    await view.rerender(<ConfirmationModal {...props} />);
    await fireEvent(view.getByTestId("confirmation-modal"), "requestClose");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
