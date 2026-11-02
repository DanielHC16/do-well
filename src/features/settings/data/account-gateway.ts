import { z } from "zod";

import {
  ShellModeSchema,
  type ShellMode,
} from "@/features/shell/model/shell-mode";
import { getSupabaseClient } from "@/shared/api/supabase";

const capabilityRowSchema = z
  .object({
    user_id: z.string().uuid(),
    role: z.enum(["user", "admin"]),
    is_admin: z.boolean(),
    preferred_mode: ShellModeSchema,
  })
  .refine((row) => row.is_admin === (row.role === "admin"));

export type AccountCapabilities = Readonly<{
  userId: string;
  isAdmin: boolean;
  preferredMode: ShellMode;
}>;

export const accountGateway = {
  async getCapabilities(userId: string): Promise<AccountCapabilities> {
    z.string().uuid().parse(userId);
    const { data, error } = await getSupabaseClient().rpc(
      "get_my_capabilities",
    );
    if (error) throw new Error("Account access could not be verified.");
    const [row] = z.array(capabilityRowSchema).length(1).parse(data);
    if (row.user_id !== userId)
      throw new Error("Account access does not match the active user.");
    return {
      userId: row.user_id,
      isAdmin: row.is_admin,
      preferredMode: row.preferred_mode,
    };
  },
  async setPreferredMode(userId: string, mode: ShellMode): Promise<void> {
    z.string().uuid().parse(userId);
    const validatedMode = ShellModeSchema.parse(mode);
    const { data, error } = await getSupabaseClient().rpc(
      "set_preferred_mode",
      { p_mode: validatedMode },
    );
    if (error) throw new Error("Workspace preference could not be saved.");
    const row = z
      .object({ id: z.string().uuid(), preferred_mode: ShellModeSchema })
      .parse(data);
    if (row.id !== userId || row.preferred_mode !== validatedMode)
      throw new Error(
        "Workspace preference was not confirmed for this account.",
      );
  },
};
