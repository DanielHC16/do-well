import { z } from "zod";

import { getSupabaseClient } from "@/shared/api/supabase";
import { withTimeout } from "@/shared/api/network-timeout";

import {
  profileEditSchema,
  type ProfileEdit,
  type EditableProfile,
} from "../model/profile-edit-schema";
export type {
  ProfileEdit,
  EditableProfile,
} from "../model/profile-edit-schema";
type Result = Readonly<{ data: unknown; error: unknown }>;
type ProfileEditPort = Readonly<{
  read: (userId: string) => Promise<Result>;
  update: (
    userId: string,
    fields: { display_name: string; home_area: string; bio: string | null },
  ) => Promise<Result>;
}>;
export type ProfileEditorGateway = Readonly<{
  read: (userId: string) => Promise<EditableProfile>;
  save: (userId: string, input: ProfileEdit) => Promise<EditableProfile>;
}>;

const profileRowSchema = z.object({
  id: z.uuid(),
  display_name: z.string().min(2).max(80),
  home_area: z.string().max(120).nullable(),
  bio: z.string().max(500).nullable(),
});

function parseOwnProfile(result: Result, userId: string): EditableProfile {
  if (result.error) throw new Error("Profile request failed");
  const row = profileRowSchema.parse(result.data);
  if (row.id !== userId) throw new Error("Profile identity mismatch");
  return {
    id: row.id,
    displayName: row.display_name,
    homeArea: row.home_area ?? "",
    bio: row.bio ?? "",
  };
}

export function createProfileEditorGateway(
  port: ProfileEditPort,
): ProfileEditorGateway {
  return {
    async read(userId) {
      z.uuid().parse(userId);
      try {
        return parseOwnProfile(await withTimeout(port.read(userId)), userId);
      } catch {
        throw new Error(
          "Unable to load your profile. Check your connection and try again.",
        );
      }
    },
    async save(userId, input) {
      z.uuid().parse(userId);
      const fields = profileEditSchema.parse(input);
      try {
        const result = await withTimeout(
          port.update(userId, {
            display_name: fields.displayName,
            home_area: fields.homeArea,
            bio: fields.bio || null,
          }),
        );
        return parseOwnProfile(result, userId);
      } catch {
        throw new Error(
          "Unable to save your profile. Your changes may not be confirmed; reopen the editor to check before retrying.",
        );
      }
    },
  };
}

function getGateway() {
  const client = getSupabaseClient();
  // Existing column grants and profiles_update_own RLS enforce ownership server-side.
  return createProfileEditorGateway({
    read: async (userId) =>
      await client
        .from("profiles")
        .select("id,display_name,home_area,bio")
        .eq("id", userId)
        .single(),
    update: async (userId, fields) =>
      await client
        .from("profiles")
        .update(fields)
        .eq("id", userId)
        .select("id,display_name,home_area,bio")
        .single(),
  });
}

export const profileEditorGateway: ProfileEditorGateway = {
  read: (userId) => getGateway().read(userId),
  save: (userId, input) => getGateway().save(userId, input),
};
