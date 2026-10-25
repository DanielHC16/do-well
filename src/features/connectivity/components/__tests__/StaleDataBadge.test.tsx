import { render } from "@testing-library/react-native";

import { StaleDataBadge } from "../StaleDataBadge";

describe("StaleDataBadge", () => {
  it("renders custom label when provided", async () => {
    const view = await render(
      <StaleDataBadge label="Saved snapshot from 10:30 AM (Offline)" />,
    );
    expect(
      view.getByText("Saved snapshot from 10:30 AM (Offline)"),
    ).toBeVisible();
  });

  it("renders formatted time when iso timestamp is provided", async () => {
    const view = await render(
      <StaleDataBadge cachedAt="2026-10-25T14:30:00.000Z" />,
    );
    expect(view.getByText(/^Saved snapshot:/)).toBeVisible();
  });

  it("renders fallback text when cachedAt is missing", async () => {
    const view = await render(<StaleDataBadge />);
    expect(view.getByText("Saved snapshot")).toBeVisible();
  });
});
