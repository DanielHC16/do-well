import { fireEvent, render } from "@testing-library/react-native";

import { CreateDemoGigScreen } from "../CreateDemoGigScreen";

const mockCreateGig = jest.fn(async () => true);
const mockReplace = jest.fn();

jest.mock("@/features/demo/context/useDemo", () => ({
  useDemo: () => ({
    state: { activePersona: "employer" },
    busy: false,
    error: null,
    createGig: mockCreateGig,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

describe("CreateDemoGigScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateGig.mockResolvedValue(true);
  });

  it("validates required gig fields before publishing", async () => {
    const view = await render(<CreateDemoGigScreen />);

    await fireEvent.press(
      view.getByRole("button", { name: "Create and publish gig" }),
    );

    expect(
      view.getByText("Enter a title with at least 3 characters."),
    ).toBeVisible();
    expect(
      view.getByText("Enter a public area for onsite work."),
    ).toBeVisible();
    expect(mockCreateGig).not.toHaveBeenCalled();
  });

  it("publishes a normalized onsite gig once", async () => {
    const view = await render(<CreateDemoGigScreen />);
    await fireEvent.changeText(view.getByLabelText("Gig title"), "Event setup");
    await fireEvent.changeText(
      view.getByLabelText("Description"),
      "Help arrange chairs before the event.",
    );
    await fireEvent.changeText(view.getByLabelText("Category"), "Events");
    await fireEvent.changeText(view.getByLabelText("Public area"), "Makati");
    await fireEvent.changeText(view.getByLabelText("Budget in PHP"), "900");
    await fireEvent.press(
      view.getByRole("button", { name: "Create and publish gig" }),
    );

    expect(mockCreateGig).toHaveBeenCalledWith({
      title: "Event setup",
      description: "Help arrange chairs before the event.",
      category: "Events",
      workMode: "onsite",
      publicArea: "Makati",
      budgetAmount: 900,
    });
    expect(mockReplace).toHaveBeenCalledWith("/(demo)");
  });

  it("keeps the completed form open when local persistence fails", async () => {
    mockCreateGig.mockResolvedValueOnce(false);
    const view = await render(<CreateDemoGigScreen />);
    await fireEvent.changeText(view.getByLabelText("Gig title"), "Event setup");
    await fireEvent.changeText(
      view.getByLabelText("Description"),
      "Help arrange chairs before the event.",
    );
    await fireEvent.changeText(view.getByLabelText("Category"), "Events");
    await fireEvent.changeText(view.getByLabelText("Public area"), "Makati");
    await fireEvent.changeText(view.getByLabelText("Budget in PHP"), "900");

    await fireEvent.press(
      view.getByRole("button", { name: "Create and publish gig" }),
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(view.getByLabelText("Gig title")).toHaveDisplayValue("Event setup");
  });
});
