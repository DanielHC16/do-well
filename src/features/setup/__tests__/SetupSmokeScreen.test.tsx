import { render } from "@testing-library/react-native";

import { SetupSmokeScreen } from "../SetupSmokeScreen";

describe("SetupSmokeScreen", () => {
  it("announces that the Do Well development setup is ready", async () => {
    const { getByRole } = await render(<SetupSmokeScreen />);

    expect(getByRole("header", { name: "Do Well" })).toBeVisible();
    expect(
      getByRole("summary", { name: "Development setup ready" }),
    ).toBeVisible();
  });
});
