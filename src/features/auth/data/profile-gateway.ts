import { z } from "zod";

import { getSupabaseClient } from "../../../shared/api/supabase";
import { createAuthError, mapAuthError } from "../model/auth-errors";
import { type AuthProfile } from "../model/auth-state";
import { displayNameSchema, homeAreaSchema } from "../model/auth-schemas";

type ProfileResult = Promise<Readonly<{ data: unknown; error: unknown }>>;

export type ProfilePort = Readonly<{
  getOwnProfile: (userId: string) => ProfileResult;
  ensureProfile: () => ProfileResult;
  completeOnboarding: (displayName: string, homeArea: string) => ProfileResult;
}>;

const profileSchema = z.object({
  id: z.string().min(1),
  display_name: z.string(),
  home_area: z.string().nullable(),
  onboarding_completed_at: z.string().nullable(),
});

function parseProfile(data: unknown): AuthProfile {
  const profile = profileSchema.parse(data);
  return {
    id: profile.id,
    displayName: profile.display_name,
    homeArea: profile.home_area,
    onboardingCompletedAt: profile.onboarding_completed_at,
  };
}

async function resolveProfile(result: Awaited<ProfileResult>) {
  if (result.error) throw mapAuthError(result.error);
  return result.data === null ? null : parseProfile(result.data);
}

export function createProfileGateway(port: ProfilePort) {
  return {
    async getOwnProfile(userId: string) {
      const profile = await resolveProfile(await port.getOwnProfile(userId));
      if (profile !== null && profile.id !== userId) {
        throw createAuthError("AUTH_PROFILE_UNAVAILABLE");
      }
      return profile;
    },
    async ensureProfile() {
      return resolveProfile(await port.ensureProfile());
    },
    async completeOnboarding(displayName: string, homeArea: string) {
      return resolveProfile(
        await port.completeOnboarding(
          displayNameSchema.parse(displayName),
          homeAreaSchema.parse(homeArea),
        ),
      );
    },
  };
}

export function createSupabaseProfileGateway() {
  const client = getSupabaseClient();
  return createProfileGateway({
    getOwnProfile: async (userId) =>
      await client
        .from("profiles")
        .select("id,display_name,home_area,onboarding_completed_at")
        .eq("id", userId)
        .maybeSingle(),
    ensureProfile: async () => await client.rpc("ensure_profile"),
    completeOnboarding: async (displayName, homeArea) =>
      await client.rpc("complete_onboarding", {
        p_display_name: displayName,
        p_home_area: homeArea,
      }),
  });
}
