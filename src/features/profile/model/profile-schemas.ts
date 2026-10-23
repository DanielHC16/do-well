import { z } from "zod";

export const onboardingProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter a name with at least 2 characters.")
    .max(80, "Keep your name to 80 characters or fewer."),
  homeArea: z
    .string()
    .trim()
    .min(1, "Enter your city or public area.")
    .max(120, "Keep your public area to 120 characters or fewer."),
});

export type OnboardingProfileInput = z.input<typeof onboardingProfileSchema>;
export type OnboardingProfile = z.output<typeof onboardingProfileSchema>;
