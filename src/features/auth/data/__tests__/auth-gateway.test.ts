import { createAuthGateway } from "../auth-gateway";

jest.mock("../../../../shared/api/supabase", () => ({
  getSupabaseClient: jest.fn(),
}));

function createAuthPort() {
  return {
    signUp: jest.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    signInWithPassword: jest.fn(
      async (_input: unknown): Promise<{ data: unknown; error: unknown }> => ({
        data: {
          user: { id: "user-a", email: "ada@example.com" },
          session: {
            access_token: "supabase-access",
            expires_at: 123,
            user: { id: "user-a", email: "ada@example.com" },
            provider_token: "must-not-cross-boundary",
          },
        },
        error: null,
      }),
    ),
    resend: jest.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: jest.fn(async () => ({ data: {}, error: null })),
    updateUser: jest.fn(async () => ({ data: { user: null }, error: null })),
    signInWithOAuth: jest.fn(async () => ({
      data: {
        provider: "google",
        url: "https://project-ref.supabase.co/auth/v1/authorize?provider=google",
        flowId: "flow-a",
      },
      error: null,
    })),
    exchangeCodeForSession: jest.fn(async () => ({
      data: { user: null, session: null },
      error: null,
    })),
    getSession: jest.fn(async () => ({ data: { session: null }, error: null })),
    getUser: jest.fn(async () => ({
      data: { user: { id: "user-a", email: "ada@example.com" } },
      error: null,
    })),
    signOut: jest.fn(async () => ({ error: null })),
    startAutoRefresh: jest.fn(async () => undefined),
    stopAutoRefresh: jest.fn(async () => undefined),
  };
}

describe("auth gateway", () => {
  it("normalizes credentials and uses exact callback routes", async () => {
    const auth = createAuthPort();
    const gateway = createAuthGateway(auth);

    await gateway.signUp(" Ada@Example.COM ", "SecurePass123", "  Ada  ");
    await gateway.signInWithPassword(" Ada@Example.COM ", "SecurePass123");
    await gateway.resendConfirmation(" Ada@Example.COM ");
    await gateway.requestPasswordReset(" Ada@Example.COM ");
    await gateway.updatePassword("AnotherPass123");

    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "SecurePass123",
      options: {
        data: { display_name: "Ada" },
        emailRedirectTo: "dowell://auth/callback",
      },
    });
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "SecurePass123",
    });
    expect(auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "ada@example.com",
      options: { emailRedirectTo: "dowell://auth/callback" },
    });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("ada@example.com", {
      redirectTo: "dowell://auth/reset-password",
    });
    expect(auth.updateUser).toHaveBeenCalledWith({
      password: "AnotherPass123",
    });
  });

  it("returns only app-owned OAuth and session fields", async () => {
    const auth = createAuthPort();
    const gateway = createAuthGateway(auth);

    await expect(gateway.beginGoogleSignIn()).resolves.toEqual({
      authorizationUrl:
        "https://project-ref.supabase.co/auth/v1/authorize?provider=google",
      flowId: "flow-a",
    });
    await gateway.exchangeCode("one-time-code", "flow-a");
    await expect(
      gateway.signInWithPassword("ada@example.com", "SecurePass123"),
    ).resolves.toEqual({
      user: { id: "user-a", email: "ada@example.com" },
      session: { expiresAt: 123 },
    });

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "dowell://auth/callback",
        skipBrowserRedirect: true,
      },
    });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code", {
      flowId: "flow-a",
    });
  });

  it("uses authoritative user lookup and local-only sign-out", async () => {
    const auth = createAuthPort();
    const gateway = createAuthGateway(auth);

    await expect(gateway.getUser()).resolves.toEqual({
      id: "user-a",
      email: "ada@example.com",
    });
    await gateway.signOutLocal();
    await gateway.startAutoRefresh();
    await gateway.stopAutoRefresh();

    expect(auth.getUser).toHaveBeenCalledTimes(1);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not reveal an unconfirmed account during password sign-in", async () => {
    const auth = createAuthPort();
    auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { code: "email_not_confirmed", message: "Email not confirmed" },
    });

    await expect(
      createAuthGateway(auth).signInWithPassword(
        "ada@example.com",
        "SecurePass123",
      ),
    ).rejects.toMatchObject({ code: "AUTH_INVALID_CREDENTIALS" });
  });
});
