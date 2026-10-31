import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { ProfileEditor } from "../ProfileEditor";

jest.mock("@/shared/api/supabase", () => ({ getSupabaseClient: jest.fn() }));

const initial = {
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Ari Santos",
  homeArea: "Makati",
  bio: "",
};

describe("ProfileEditor", () => {
  it("preserves edits and never reports success after a rejected save", async () => {
    const onSaved = jest.fn();
    const gateway = {
      read: jest.fn(),
      save: jest.fn(async () => {
        throw new Error("private");
      }),
    };
    const view = await render(
      <ProfileEditor
        initial={initial}
        gateway={gateway}
        onSaved={onSaved}
        onCancel={jest.fn()}
      />,
    );
    await fireEvent.changeText(view.getByLabelText("Bio"), "Student designer");
    await fireEvent.press(view.getByRole("button", { name: "Save profile" }));
    await waitFor(() =>
      expect(view.getByRole("alert")).toHaveTextContent(
        /We couldn't save your profile/,
      ),
    );
    expect(view.getByLabelText("Bio")).toHaveDisplayValue("Student designer");
    expect(onSaved).not.toHaveBeenCalled();
  });
  it("requires a valid name and waits for authoritative data before success", async () => {
    const onSaved = jest.fn();
    const gateway = { read: jest.fn(), save: jest.fn(async () => initial) };
    const view = await render(
      <ProfileEditor
        initial={initial}
        gateway={gateway}
        onSaved={onSaved}
        onCancel={jest.fn()}
      />,
    );
    await fireEvent.changeText(view.getByLabelText("Display name"), "A");
    await fireEvent.press(view.getByRole("button", { name: "Save profile" }));
    expect(gateway.save).not.toHaveBeenCalled();
    await fireEvent.changeText(
      view.getByLabelText("Display name"),
      "Ari Santos",
    );
    await fireEvent.press(view.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(initial));
  });
});
