import { z } from "zod";

export const ShellModeSchema = z.enum(["worker", "employer"]);
export type ShellMode = z.infer<typeof ShellModeSchema>;

export const ShellUserIdSchema = z.string().trim().min(1).max(200);
