import { createProfileGateway } from "../profile-gateway";

jest.mock("../../../../shared/api/supabase", () => ({
  getSupabaseClient: jest.fn(),
}));

const databaseProfile = {
  id: "user-a",
  display_name: "Ada",
  home_area: "Makati",
  onboarding_completed_at: "2026-10-23T00:00:00.000Z",
};

function createProfilePort() {
  return {
    getOwnProfile: jest.fn(
      async (): Promise<{ data: unknown; error: unknown }> => ({
        data: databaseProfile,
        error: null,
      }),
    ),
    ensureProfile: jest.fn(async () => ({
      data: databaseProfile,
      error: null,
    })),
    completeOnboarding: jest.fn(async () => ({
      data: databaseProfile,
      error: null,
    })),
  };
}

describe("profile gateway", () => {
  it("maps database rows and calls the secure profile operations", async () => {
    const port = createProfilePort();
    const gateway = createProfileGateway(port);

    await expect(gateway.getOwnProfile("user-a")).resolves.toMatchObject({
      id: "user-a",
      displayName: "Ada",
      homeArea: "Makati",
    });
    await gateway.ensureProfile();
    await gateway.completeOnboarding("  Ada  ", "  Makati  ", "employer");

    expect(port.getOwnProfile).toHaveBeenCalledWith("user-a");
    expect(port.ensureProfile).toHaveBeenCalledTimes(1);
    expect(port.completeOnboarding).toHaveBeenCalledWith(
      "Ada",
      "Makati",
      "employer",
    );
  });

  it("rejects a profile that does not belong to the requested user", async () => {
    const port = createProfilePort();

    await expect(
      createProfileGateway(port).getOwnProfile("user-b"),
    ).rejects.toMatchObject({ code: "AUTH_PROFILE_UNAVAILABLE" });
  });

  it("maps malformed profile data to a stable profile error", async () => {
    const port = createProfilePort();
    port.getOwnProfile.mockResolvedValueOnce({
      data: { id: "user-a", display_name: null },
      error: null,
    });

    await expect(
      createProfileGateway(port).getOwnProfile("user-a"),
    ).rejects.toMatchObject({ code: "AUTH_PROFILE_UNAVAILABLE" });
  });
});
