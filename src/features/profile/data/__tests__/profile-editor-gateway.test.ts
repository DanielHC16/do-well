import { createProfileEditorGateway } from "../profile-editor-gateway";

jest.mock("@/shared/api/supabase", () => ({ getSupabaseClient: jest.fn() }));

const id = "11111111-1111-4111-8111-111111111111";
const row = {
  id,
  display_name: "Ari Santos",
  home_area: "Makati",
  bio: "Student designer",
};

describe("profile editor gateway", () => {
  it("validates input before issuing a write", async () => {
    const update = jest.fn();
    const gateway = createProfileEditorGateway({ read: jest.fn(), update });
    await expect(
      gateway.save(id, { displayName: "A", homeArea: "Makati", bio: "" }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });
  it("writes only editable fields and returns validated server data", async () => {
    const update = jest.fn(async () => ({ data: row, error: null }));
    const gateway = createProfileEditorGateway({ read: jest.fn(), update });
    await expect(
      gateway.save(id, {
        displayName: " Ari Santos ",
        homeArea: " Makati ",
        bio: " Student designer ",
      }),
    ).resolves.toEqual({
      id,
      displayName: "Ari Santos",
      homeArea: "Makati",
      bio: "Student designer",
    });
    expect(update).toHaveBeenCalledWith(id, {
      display_name: "Ari Santos",
      home_area: "Makati",
      bio: "Student designer",
    });
  });
  it("fails closed for failed writes and another identity's result", async () => {
    const update = jest.fn(
      async (): Promise<{ data: unknown; error: unknown }> => ({
        data: row,
        error: { message: "private vendor detail" },
      }),
    );
    const gateway = createProfileEditorGateway({ read: jest.fn(), update });
    const input = { displayName: "Ari Santos", homeArea: "Makati", bio: "" };
    await expect(gateway.save(id, input)).rejects.toThrow(
      "Unable to save your profile",
    );
    update.mockResolvedValueOnce({
      data: { ...row, id: "22222222-2222-4222-8222-222222222222" },
      error: null,
    });
    await expect(gateway.save(id, input)).rejects.toThrow(
      "Unable to save your profile",
    );
  });
});
