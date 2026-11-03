import { fireEvent, render } from "@testing-library/react-native";

import { createDemoSeed } from "../../data/demo-seed";
import { ManageDemoGigScreen } from "../ManageDemoGigScreen";

const mockPush = jest.fn();
jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: jest.requireActual("../../data/demo-seed").createDemoSeed(),
    busy: false,
    error: null,
    selectApplication: jest.fn(),
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

it("offers posting another gig when an existing listing has no applicants", async () => {
  const view = await render(
    <ManageDemoGigScreen gigId={createDemoSeed().gigs[0].id} />,
  );
  expect(view.getByText("No applications yet")).toBeVisible();
  expect(view.queryByText(/demo|synthetic|presenter/i)).toBeNull();
  await fireEvent.press(view.getByRole("button", { name: "Post a gig" }));
  expect(mockPush).toHaveBeenCalledWith("/(demo)/employer/gigs/new");
});
