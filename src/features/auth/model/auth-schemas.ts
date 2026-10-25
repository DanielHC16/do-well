import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const displayNameSchema = z.string().trim().min(2).max(80);

export const homeAreaSchema = z.string().trim().min(1).max(120);
export const accountModeSchema = z.enum(["worker", "employer"]);

export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type DisplayName = z.infer<typeof displayNameSchema>;
export type HomeArea = z.infer<typeof homeAreaSchema>;
export type AccountMode = z.infer<typeof accountModeSchema>;
