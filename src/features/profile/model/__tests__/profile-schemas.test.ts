import { onboardingProfileSchema } from "../profile-schemas";

describe("onboarding profile schema", () => {
  it("requires a display name, public home area, and valid preferred mode", () => {
    const result = onboardingProfileSchema.safeParse({
      displayName: " ",
      homeArea: " ",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toEqual({
        displayName: ["Enter a name with at least 2 characters."],
        homeArea: ["Enter your city or public area."],
        preferredMode: ['Invalid option: expected one of "worker"|"employer"'],
      });
    }
  });

  it("trims valid values before enforcing the database boundaries", () => {
    expect(
      onboardingProfileSchema.parse({
        displayName: `  ${"n".repeat(80)}  `,
        homeArea: `  ${"a".repeat(120)}  `,
        preferredMode: "worker",
      }),
    ).toEqual({
      displayName: "n".repeat(80),
      homeArea: "a".repeat(120),
      preferredMode: "worker",
    });

    expect(
      onboardingProfileSchema.safeParse({
        displayName: "n".repeat(81),
        homeArea: "Makati",
        preferredMode: "worker",
      }).success,
    ).toBe(false);
    expect(
      onboardingProfileSchema.safeParse({
        displayName: "Ada",
        homeArea: "a".repeat(121),
        preferredMode: "worker",
      }).success,
    ).toBe(false);
    expect(
      onboardingProfileSchema.safeParse({
        displayName: "Ada",
        homeArea: "Makati",
        preferredMode: "admin",
      }).success,
    ).toBe(false);
  });
});
