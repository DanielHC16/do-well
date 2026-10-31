import { fireEvent, render } from "@testing-library/react-native";

import { WelcomeWalkthrough } from "../WelcomeWalkthrough";

describe("WelcomeWalkthrough", () => {
  it("labels its artwork as illustrative and completes only after all three steps", async () => {
    const onFinish = jest.fn();
    const view = await render(<WelcomeWalkthrough onFinish={onFinish} />);
    expect(
      view.getByRole("image", {
        name: /Illustration: nearby and remote opportunity cards/i,
      }),
    ).toBeVisible();
    await fireEvent.press(view.getByRole("button", { name: "Continue" }));
    expect(
      view.getByRole("header", { name: "Find help for short-term tasks" }),
    ).toBeVisible();
    await fireEvent.press(view.getByRole("button", { name: "Continue" }));
    expect(
      view.getByRole("header", { name: "Manage work efficiently" }),
    ).toBeVisible();
    expect(onFinish).not.toHaveBeenCalled();
    await fireEvent.press(view.getByRole("button", { name: "Get started" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("lets people skip immediately", async () => {
    const onFinish = jest.fn();
    const view = await render(<WelcomeWalkthrough onFinish={onFinish} />);
    await fireEvent.press(
      view.getByRole("button", { name: "Skip introduction" }),
    );
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
