import { authReducer, initialAuthState } from "../auth-reducer";

const profile = {
  id: "user-a",
  displayName: "Ada",
  homeArea: "Makati",
  onboardingCompletedAt: "2026-10-23T00:00:00.000Z",
} as const;

describe("authReducer", () => {
  it("restores a validated session and routes a complete profile to ready", () => {
    const restoring = authReducer(initialAuthState, {
      type: "RESTORE_STARTED",
      operationId: 1,
    });
    const validating = authReducer(restoring, {
      type: "SESSION_FOUND",
      operationId: 1,
      userId: "user-a",
    });
    const loadingProfile = authReducer(validating, {
      type: "USER_VALIDATED",
      operationId: 1,
      userId: "user-a",
    });
    const ready = authReducer(loadingProfile, {
      type: "PROFILE_LOADED",
      operationId: 1,
      profile,
    });

    expect(restoring).toMatchObject({
      route: "restoring",
      status: "restoring",
    });
    expect(validating).toMatchObject({
      route: "restoring",
      status: "validating",
    });
    expect(loadingProfile).toMatchObject({
      route: "restoring",
      status: "loadingProfile",
      userId: "user-a",
    });
    expect(ready).toMatchObject({
      route: "ready",
      status: "idle",
      userId: "user-a",
      profile,
      error: null,
    });
  });

  it("routes a missing session to signed out", () => {
    const restoring = authReducer(initialAuthState, {
      type: "RESTORE_STARTED",
      operationId: 1,
    });

    expect(
      authReducer(restoring, { type: "SESSION_MISSING", operationId: 1 }),
    ).toMatchObject({ route: "signedOut", status: "idle", userId: null });
  });

  it("routes an incomplete profile to onboarding and completion to ready", () => {
    const state = authReducer(
      authReducer(
        authReducer(initialAuthState, {
          type: "SIGN_IN_STARTED",
          operationId: 2,
        }),
        {
          type: "USER_VALIDATED",
          operationId: 2,
          userId: "user-a",
        },
      ),
      {
        type: "PROFILE_LOADED",
        operationId: 2,
        profile: { ...profile, onboardingCompletedAt: null },
      },
    );

    expect(state.route).toBe("needsOnboarding");
    expect(
      authReducer(state, {
        type: "ONBOARDING_COMPLETED",
        operationId: 2,
        profile,
      }),
    ).toMatchObject({ route: "ready", profile });
  });

  it("surfaces a missing profile without treating the user as ready", () => {
    const loading = authReducer(
      authReducer(initialAuthState, {
        type: "SIGN_IN_STARTED",
        operationId: 3,
      }),
      { type: "USER_VALIDATED", operationId: 3, userId: "user-a" },
    );

    expect(
      authReducer(loading, { type: "PROFILE_MISSING", operationId: 3 }),
    ).toMatchObject({
      route: "needsOnboarding",
      status: "idle",
      error: { code: "AUTH_PROFILE_UNAVAILABLE" },
    });
  });

  it("keeps the current route available during a network failure", () => {
    const ready = {
      ...initialAuthState,
      route: "ready" as const,
      userId: "user-a",
      profile,
    };

    expect(
      authReducer(
        { ...ready, operationId: 4 },
        { type: "NETWORK_UNAVAILABLE", operationId: 4, userId: "user-a" },
      ),
    ).toMatchObject({
      route: "ready",
      status: "offline",
      error: { code: "AUTH_NETWORK_UNAVAILABLE" },
    });
  });

  it("validates an established route without clearing its profile gate", () => {
    const ready = {
      ...initialAuthState,
      route: "ready" as const,
      status: "idle" as const,
      userId: "user-a",
      profile,
      operationId: 3,
    };

    const validating = authReducer(ready, {
      type: "VALIDATION_STARTED",
      operationId: 4,
      userId: "user-a",
    });
    expect(validating).toMatchObject({
      route: "ready",
      status: "validating",
      profile,
    });
    expect(
      authReducer(validating, {
        type: "SESSION_VALIDATED",
        operationId: 4,
        userId: "user-a",
      }),
    ).toMatchObject({ route: "ready", status: "idle", profile, error: null });
  });

  it("blocks on an unexpected profile failure instead of routing to onboarding", () => {
    const loading = authReducer(
      authReducer(initialAuthState, {
        type: "RESTORE_STARTED",
        operationId: 4,
      }),
      { type: "USER_VALIDATED", operationId: 4, userId: "user-a" },
    );

    expect(
      authReducer(loading, {
        type: "PROFILE_LOAD_FAILED",
        operationId: 4,
        userId: "user-a",
        errorCode: "AUTH_PROFILE_UNAVAILABLE",
      }),
    ).toMatchObject({
      route: "restoring",
      status: "idle",
      userId: "user-a",
      error: { code: "AUTH_PROFILE_UNAVAILABLE", retryable: true },
    });
  });

  it("preserves a stable profile failure code for retry guidance", () => {
    const loading = {
      ...initialAuthState,
      route: "restoring" as const,
      status: "loadingProfile" as const,
      userId: "user-a",
      operationId: 5,
    };

    expect(
      authReducer(loading, {
        type: "PROFILE_LOAD_FAILED",
        operationId: 5,
        userId: "user-a",
        errorCode: "AUTH_RATE_LIMITED",
      }),
    ).toMatchObject({
      route: "restoring",
      error: { code: "AUTH_RATE_LIMITED", retryable: true },
    });
  });

  it("clears identity when a token is revoked or sign-out completes", () => {
    const ready = {
      ...initialAuthState,
      route: "ready" as const,
      userId: "user-a",
      profile,
    };
    const expired = authReducer(
      { ...ready, operationId: 4 },
      { type: "SESSION_REVOKED", operationId: 4, userId: "user-a" },
    );
    const signingOut = authReducer(ready, {
      type: "SIGN_OUT_STARTED",
      operationId: 5,
    });

    expect(expired).toMatchObject({
      route: "signedOut",
      userId: null,
      profile: null,
      error: { code: "AUTH_SESSION_EXPIRED" },
    });
    expect(
      authReducer(signingOut, { type: "SIGNED_OUT", operationId: 5 }),
    ).toMatchObject({ route: "signedOut", status: "idle", userId: null });
  });

  it("resets profile state when the authenticated account changes", () => {
    const ready = {
      ...initialAuthState,
      route: "ready" as const,
      userId: "user-a",
      profile,
    };

    expect(
      authReducer(ready, {
        type: "ACCOUNT_CHANGED",
        operationId: 6,
        userId: "user-b",
      }),
    ).toMatchObject({
      route: "restoring",
      status: "loadingProfile",
      userId: "user-b",
      profile: null,
      operationId: 6,
    });
  });

  it("ignores duplicate events and stale async results", () => {
    const restoring = authReducer(initialAuthState, {
      type: "RESTORE_STARTED",
      operationId: 8,
    });
    const duplicate = authReducer(restoring, {
      type: "RESTORE_STARTED",
      operationId: 8,
    });
    const stale = authReducer(restoring, {
      type: "SESSION_FOUND",
      operationId: 7,
      userId: "stale-user",
    });

    expect(duplicate).toBe(restoring);
    expect(stale).toBe(restoring);
  });

  it("ignores an older start event after a newer operation begins", () => {
    const latest = authReducer(initialAuthState, {
      type: "RESTORE_STARTED",
      operationId: 8,
    });

    expect(
      authReducer(latest, { type: "SIGN_IN_STARTED", operationId: 7 }),
    ).toBe(latest);
    expect(
      authReducer(latest, {
        type: "ACCOUNT_CHANGED",
        operationId: 7,
        userId: "stale-user",
      }),
    ).toBe(latest);
  });

  it("ignores stale failure and completion events after an account switch", () => {
    const current = {
      ...initialAuthState,
      route: "needsOnboarding" as const,
      status: "idle" as const,
      userId: "user-b",
      operationId: 9,
    };

    expect(
      authReducer(current, {
        type: "NETWORK_UNAVAILABLE",
        operationId: 8,
        userId: "user-a",
      }),
    ).toBe(current);
    expect(
      authReducer(current, {
        type: "SESSION_REVOKED",
        operationId: 8,
        userId: "user-a",
      }),
    ).toBe(current);
    expect(
      authReducer(current, {
        type: "ONBOARDING_COMPLETED",
        operationId: 8,
        profile,
      }),
    ).toBe(current);
  });
});
