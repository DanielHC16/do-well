import { z } from "zod";

export const profileEditSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80, "Keep your name to 80 characters."),
  homeArea: z
    .string()
    .trim()
    .min(1, "Enter your city or public area.")
    .max(120, "Keep your public area to 120 characters."),
  bio: z.string().trim().max(500, "Keep your bio to 500 characters."),
});

export type ProfileEdit = z.infer<typeof profileEditSchema>;
export type EditableProfile = ProfileEdit & Readonly<{ id: string }>;
