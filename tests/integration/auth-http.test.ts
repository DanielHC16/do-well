import { z } from "zod";

import { loadLocalSupabaseEnvironment } from "../../scripts/local-supabase-env.cjs";

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  user: z.object({ id: z.string().uuid() }),
});

const profileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  home_area: z.string().nullable(),
  onboarding_completed_at: z.string().nullable(),
});

type LocalEnvironment = Awaited<
  ReturnType<typeof loadLocalSupabaseEnvironment>
>;

type Session = z.infer<typeof sessionSchema>;

async function readJson(
  response: Response,
  operation: string,
): Promise<unknown> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    const contentType = response.headers.get("content-type") ?? "missing";
    throw new Error(
      `${operation} returned non-JSON HTTP ${response.status} (${contentType})`,
    );
  }

  if (!response.ok) {
    throw new Error(`${operation} failed with HTTP ${response.status}`);
  }

  return body;
}

function publicHeaders(environment: LocalEnvironment, accessToken?: string) {
  return {
    apikey: environment.publishableKey,
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function adminHeaders(environment: LocalEnvironment) {
  return {
    apikey: environment.serviceRoleKey,
    Authorization: `Bearer ${environment.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function signUp(
  environment: LocalEnvironment,
  email: string,
  password: string,
): Promise<Session> {
  const response = await fetch(`${environment.apiUrl}/auth/v1/signup`, {
    method: "POST",
    headers: publicHeaders(environment),
    body: JSON.stringify({ email, password }),
  });

  return sessionSchema.parse(await readJson(response, "signup"));
}

async function deleteUser(
  environment: LocalEnvironment,
  userId: string,
): Promise<void> {
  const response = await fetch(
    `${environment.apiUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    { method: "DELETE", headers: adminHeaders(environment) },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`fixture cleanup failed with HTTP ${response.status}`);
  }
}

async function readOwnProfile(
  environment: LocalEnvironment,
  session: Session,
): Promise<z.infer<typeof profileSchema>> {
  const response = await fetch(
    `${environment.apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(session.user.id)}&select=id,display_name,home_area,onboarding_completed_at`,
    { headers: publicHeaders(environment, session.access_token) },
  );
  const profiles = z
    .array(profileSchema)
    .parse(await readJson(response, "profile read"));

  if (profiles.length !== 1) {
    throw new Error("profile read returned an unexpected row count");
  }

  return profiles[0];
}

describe("local Supabase Auth and JWT profile lifecycle", () => {
  it("proves Auth, RLS, repair, onboarding, refresh, and signout over HTTP", async () => {
    const environment = await loadLocalSupabaseEnvironment();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const password = `Local-${suffix}-Aa1`;
    const createdUserIds: string[] = [];

    try {
      const first = await signUp(
        environment,
        `auth-a-${suffix}@example.test`,
        password,
      );
      createdUserIds.push(first.user.id);
      const second = await signUp(
        environment,
        `auth-b-${suffix}@example.test`,
        password,
      );
      createdUserIds.push(second.user.id);

      expect((await readOwnProfile(environment, first)).display_name).toBe(
        "New user",
      );

      const deleteProfileResponse = await fetch(
        `${environment.apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(first.user.id)}`,
        { method: "DELETE", headers: adminHeaders(environment) },
      );
      expect(deleteProfileResponse.status).toBe(204);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const repairResponse = await fetch(
          `${environment.apiUrl}/rest/v1/rpc/ensure_profile`,
          {
            method: "POST",
            headers: publicHeaders(environment, first.access_token),
            body: "{}",
          },
        );
        expect(repairResponse.status).toBe(200);
      }
      expect((await readOwnProfile(environment, first)).display_name).toBe(
        "New user",
      );

      const crossUserUpdate = await fetch(
        `${environment.apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(second.user.id)}`,
        {
          method: "PATCH",
          headers: {
            ...publicHeaders(environment, first.access_token),
            Prefer: "return=representation",
          },
          body: JSON.stringify({ display_name: "Unauthorized update" }),
        },
      );
      expect(crossUserUpdate.status).toBe(200);
      expect(await crossUserUpdate.json()).toEqual([]);
      expect((await readOwnProfile(environment, second)).display_name).toBe(
        "New user",
      );

      const directCompletion = await fetch(
        `${environment.apiUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(first.user.id)}`,
        {
          method: "PATCH",
          headers: publicHeaders(environment, first.access_token),
          body: JSON.stringify({
            onboarding_completed_at: new Date().toISOString(),
          }),
        },
      );
      expect(directCompletion.status).toBeGreaterThanOrEqual(400);

      const invalidCompletion = await fetch(
        `${environment.apiUrl}/rest/v1/rpc/complete_onboarding`,
        {
          method: "POST",
          headers: publicHeaders(environment, first.access_token),
          body: JSON.stringify({ p_display_name: " ", p_home_area: "Manila" }),
        },
      );
      expect(invalidCompletion.status).toBe(400);

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const completionResponse = await fetch(
          `${environment.apiUrl}/rest/v1/rpc/complete_onboarding`,
          {
            method: "POST",
            headers: publicHeaders(environment, first.access_token),
            body: JSON.stringify({
              p_display_name: "Local Auth User",
              p_home_area: "Manila",
            }),
          },
        );
        expect(completionResponse.status).toBe(200);
      }

      const completedProfile = await readOwnProfile(environment, first);
      expect(completedProfile).toMatchObject({
        display_name: "Local Auth User",
        home_area: "Manila",
      });
      expect(completedProfile.onboarding_completed_at).not.toBeNull();

      const passwordSignInResponse = await fetch(
        `${environment.apiUrl}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: publicHeaders(environment),
          body: JSON.stringify({
            email: `auth-a-${suffix}@example.test`,
            password,
          }),
        },
      );
      const signedIn = sessionSchema.parse(
        await readJson(passwordSignInResponse, "password sign-in"),
      );
      expect(signedIn.user.id).toBe(first.user.id);

      const refreshResponse = await fetch(
        `${environment.apiUrl}/auth/v1/token?grant_type=refresh_token`,
        {
          method: "POST",
          headers: publicHeaders(environment),
          body: JSON.stringify({ refresh_token: signedIn.refresh_token }),
        },
      );
      const refreshed = sessionSchema.parse(
        await readJson(refreshResponse, "token refresh"),
      );
      expect(refreshed.user.id).toBe(first.user.id);

      const tamperedTokenResponse = await fetch(
        `${environment.apiUrl}/rest/v1/profiles?select=id&limit=1`,
        {
          headers: publicHeaders(
            environment,
            `${refreshed.access_token.slice(0, -1)}x`,
          ),
        },
      );
      expect(tamperedTokenResponse.status).toBe(401);

      const signoutResponse = await fetch(
        `${environment.apiUrl}/auth/v1/logout?scope=local`,
        {
          method: "POST",
          headers: publicHeaders(environment, refreshed.access_token),
        },
      );
      expect(signoutResponse.status).toBe(204);
    } finally {
      for (const userId of createdUserIds) {
        await deleteUser(environment, userId);
      }
    }
  });
});
