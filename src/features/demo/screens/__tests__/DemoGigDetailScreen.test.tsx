import { fireEvent, render } from "@testing-library/react-native";

import { createDemoSeed } from "../../data/demo-seed";
import { DemoGigDetailScreen } from "../DemoGigDetailScreen";

const mockApplyToGig = jest.fn(async () => undefined);

jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: {
      ...jest.requireActual("../../data/demo-seed").createDemoSeed(),
      activePersona: "worker",
    },
    busy: false,
    error: null,
    applyToGig: mockApplyToGig,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe("DemoGigDetailScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows gig terms and validates the application message", async () => {
    const gig = createDemoSeed().gigs[0];
    const view = await render(<DemoGigDetailScreen gigId={gig.id} />);

    expect(view.getByText("PHP 750")).toBeVisible();
    expect(view.getByText("Why this may fit")).toBeVisible();
    await fireEvent.press(
      view.getByRole("button", { name: "Send application" }),
    );
    expect(view.getByText("Write at least 10 characters.")).toBeVisible();
  });

  it("sends one bounded local application", async () => {
    const gig = createDemoSeed().gigs[0];
    const view = await render(<DemoGigDetailScreen gigId={gig.id} />);
    await fireEvent.changeText(
      view.getByLabelText("Message to the employer"),
      "I can handle this delivery carefully.",
    );
    await fireEvent.press(
      view.getByRole("button", { name: "Send application" }),
    );

    expect(mockApplyToGig).toHaveBeenCalledWith(
      gig.id,
      "I can handle this delivery carefully.",
    );
  });
});
