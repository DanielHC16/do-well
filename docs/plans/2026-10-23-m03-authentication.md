# M03 Authentication and Profile Onboarding Implementation Plan

> **For Claude:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Deliver email/password and Google browser authentication, safe session restoration, idempotent profile repair, and server-controlled onboarding on an Android development build.

**Architecture:** Put the four-state session lifecycle in a pure reducer, isolate Supabase behind typed gateways, and mount one narrow Auth provider at the root. Use Supabase PKCE with an expiring single-attempt marker, strict deep-link validation, the documented AsyncStorage adapter, and hardened PostgreSQL RPCs for profile repair/onboarding completion. Route guards improve UX; RLS and RPCs remain the authority.

**Tech Stack:** Expo SDK 58, Expo Router, React Native 0.88, TypeScript strict, Jest 30/React Native Testing Library, Supabase JS 2.x, AsyncStorage, Zod, PostgreSQL/RLS/pgTAP.

---

## Grounded contract

- M03 requires both auth methods, malicious-callback rejection, profile repair, onboarding guards, explicit offline/expiration UX, and logout cleanup (`docs/IMPLEMENTATION_ROADMAP.md:118-131`).
- The app currently has only a root stack and setup route (`app/_layout.tsx:1-5`, `app/index.tsx:1-5`).
- The permanent `dowell` scheme and Android package are configured and tested (`app.config.ts:6-11`, `tests/config/app-config.test.ts:24-34`).
- The minimal profile trigger exists and is hardened (`supabase/migrations/20261022000100_schema_foundation.sql:507-534`; `supabase/tests/020_profile_provisioning.test.sql:6-23`).
- Clients cannot set `onboarding_completed_at` (`supabase/migrations/20261022000200_authorization_foundation.sql:133-136`; `supabase/tests/030_rls_and_grants.test.sql:204-222`), but the promised repair/completion RPCs do not yet exist.
- Real Auth/PostgREST JWT integration is an explicit M03 prerequisite (`docs/SESSION_HANDOFF.md:33-38,55-60`).

## Chosen design and defaults

- Use a pure reducer + typed gateway + one Auth context. Do not add a state-machine package.
- Route states remain exactly `restoring`, `signedOut`, `needsOnboarding`, and `ready`. Network, session trust, and stable error codes are orthogonal fields.
- Use AsyncStorage as Supabase's documented React Native adapter. Do not invent a SecureStore adapter in M03.
- Allow only one OAuth attempt at a time. Store a five-minute app-owned pending marker; Supabase's persisted PKCE verifier provides cryptographic binding. Consume the marker before code exchange so duplicate callbacks fail closed.
- Use explicit `scope: "local"` for ordinary logout; JavaScript's default global scope would sign out other devices.
- If a persisted session cannot establish a user-keyed profile gate while offline, remain on a blocking `restoring` recovery screen. Never infer completed onboarding from a local JWT.
- M03 does not add a general offline queue or retained drafts. Clear only app-owned auth/recovery/attempt/profile-gate data and prior-user query data; never wipe all AsyncStorage.
- Promote ADR 0002 to Accepted before merge because the roadmap already treats that flow as approved. Do not change ADR 0001 unless its broader TanStack Query decision is separately approved.

## External completion blockers

Implementation and local proof can proceed, but M03 must remain `IN PROGRESS` until an authorized operator has:

- configured the hosted Supabase Google provider without exposing its secret;
- added exact `dowell://auth/callback` and `dowell://auth/reset-password` redirects;
- configured the Google consent screen and test users;
- verified hosted email confirmation/reset behavior; and
- completed the physical-device matrix.

No hosted Supabase project was linked at the M02 handoff (`docs/SESSION_HANDOFF.md:40-46`). Credential values, callback URLs with query parameters, sessions, tokens, and personal email addresses must never appear in commands, logs, screenshots, fixtures, commits, issues, or PR text.

## Task A: Start M03 and pin client dependencies

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Create: `src/shared/config/public-env.ts`
- Create: `src/shared/config/__tests__/public-env.test.ts`
- Modify later at closeout: `docs/adr/0002-browser-oauth-and-deep-linking.md`

1. Confirm `feat/supabase-auth` is based on current `main` and issue #4 is `IN PROGRESS`.
2. Write failing tests for missing values, secret-shaped public names, non-HTTPS hosted URLs, wrong hosts, a valid `https://<ref>.supabase.co` origin, and a narrowly allowed development-local origin.
3. Run:

   ```powershell
   npm run test:run -- public-env
   ```

   Expected red result: module/config parser is missing.
4. Install compatible dependencies:

   ```powershell
   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
   npm install zod
   ```

5. Read environment values through direct Expo-inlineable property access only. Validate without including values in an error. Add only public placeholders to `.env.example`.
6. Run the targeted test again (expected PASS), then `npm run typecheck` and `npm run format:check`.
7. Checkpoint commit: `chore(auth): add validated Supabase client dependencies`.

## Task B: Add profile repair and completion RPCs test-first

**Files:**

- Create: `supabase/migrations/20261023000100_auth_profile_rpcs.sql`
- Create: `supabase/tests/060_auth_profile_rpcs.test.sql`
- Modify: `package.json`
- Regenerate: `src/types/database.generated.ts`

1. Add pgTAP assertions for missing `ensure_profile()` and `complete_onboarding(text,text)`, then run `npm run db:test`.
2. Expected red result: function/signature assertions fail.
3. Implement `ensure_profile()` with no caller identity argument. It must derive `auth.uid()`, reject anonymous use, insert `New user` only when absent, use `ON CONFLICT DO NOTHING`, and return only the caller's profile.
4. Implement `complete_onboarding(display_name text, home_area text)`. Trim/validate name 2–80 and public area 1–120, update only `auth.uid()`, set completion server-side, and make repeated identical calls safe.
5. Both functions must use `SECURITY DEFINER SET search_path = ''`, schema-qualified objects, revoked `public`/`anon` execute, and an explicit `authenticated` grant.
6. Test anonymous rejection, cross-user impossibility, repair and completion idempotency, boundary rejection, and continued direct-column denial.
7. Run:

   ```powershell
   npm run db:reset
   npm run db:lint
   npm run db:test
   npm run db:types
   npm run db:types:check
   ```

   Expected green result: clean reset/lint, all functional pgTAP files pass, generated types are current.
8. Checkpoint commit: `feat(profile): add secure onboarding RPCs`.

## Task C: Prove the real local Auth/JWT HTTP path

**Files:**

- Create: `tests/integration/auth-http.test.ts`
- Create: `jest.integration.config.js`
- Create: `scripts/local-supabase-env.mjs`
- Modify: `jest.config.js`
- Modify: `package.json`
- Modify: `supabase/config.toml`

1. Exclude `tests/integration/**` from ordinary Jest and add `test:auth:integration` with a Node test environment.
2. Create an in-memory helper that parses disposable local values from `supabase status -o env`, redacts child-process failures, and never prints keys or sessions.
3. Write the integration test first: public Auth signup with a unique synthetic email, JWT REST read of the trigger-created profile, both RPCs, cross-user denial, local signout, and admin deletion in `finally`.
4. Run `npm run test:auth:integration`.
5. Expected red result: missing scripts/helper and/or absent RPC behavior.
6. Add exact local app redirects and a 12-character password minimum to `supabase/config.toml`. Keep local confirmation disabled only as a documented deterministic-test exception; hosted non-demo confirmation remains enabled.
7. Implement the test harness without logging credentials, tokens, response bodies, or callback URLs.
8. Run:

   ```powershell
   npm run db:reset
   npm run test:auth:integration
   ```

   Expected green result: Auth, trigger, JWT RLS, repair, completion, isolation, signout, and cleanup all pass.
9. Checkpoint commit: `test(auth): verify local JWT and profile lifecycle`.

## Task D: Define the session lifecycle before UI

**Files:**

- Create: `src/features/auth/model/auth-state.ts`
- Create: `src/features/auth/model/auth-reducer.ts`
- Create: `src/features/auth/model/auth-errors.ts`
- Create: `src/features/auth/model/__tests__/auth-reducer.test.ts`
- Create: `src/features/auth/model/__tests__/auth-errors.test.ts`

1. Write tests for restore start/result, validated user, profile loaded/missing, network failure, revoked token, sign-in/out, completion, account change, duplicate events, and stale async results.
2. Run `npm run test:run -- auth-reducer auth-errors`.
3. Expected red result: model modules are missing.
4. Implement a discriminated reducer with the four route states and typed orthogonal status/error fields.
5. Map provider failures to the stable codes in `docs/AUTHENTICATION.md:200-218`; renderable state must contain no raw vendor message.
6. Re-run the targeted tests (expected PASS).
7. Checkpoint commit: `test(auth): define session lifecycle behavior`.

## Task E: Build the Supabase gateway and storage boundary

**Files:**

- Create: `src/shared/api/supabase.ts`
- Create: `src/shared/persistence/auth-storage.ts`
- Create: `src/features/auth/data/auth-gateway.ts`
- Create: `src/features/auth/data/profile-gateway.ts`
- Create: `src/features/auth/model/auth-schemas.ts`
- Create matching `__tests__` files

1. Write failing tests for one client instance, PKCE, persistence, disabled URL auto-detection, and provider-token non-persistence.
2. Verify the installed package's exported API before using any process lock. Omit the lock if no supported public export exists.
3. Configure `flowType: "pkce"`, `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: false`, AsyncStorage, and the URL polyfill.
4. Add schemas for normalized email, 12+ character password, display name, and home area.
5. Implement typed gateway methods for signup/sign-in/resend/reset/update, Google authorization, code exchange, `getSession`, authoritative `getUser`, explicit local signout, and profile RPCs. Keep Supabase types/errors inside the gateway.
6. Run targeted tests, `npm run lint`, and `npm run typecheck` (expected PASS).
7. Checkpoint commit: `feat(auth): add Supabase auth gateway`.

## Task F: Validate OAuth and recovery callbacks

**Files:**

- Create: `src/features/auth/model/oauth-callback.ts`
- Create: `src/features/auth/model/__tests__/oauth-callback.test.ts`
- Extend: `src/shared/persistence/auth-storage.ts`

1. Write a hostile-input table covering exact scheme, hostname, path, no username/password/port/fragment, exactly one code, provider error parameters, absent/expired pending marker, duplicate consumption, and wrong authorization origin/path.
2. Run `npm run test:run -- oauth-callback`.
3. Expected red result: callback parser/attempt store is missing.
4. Implement exact callbacks `dowell://auth/callback` and `dowell://auth/reset-password`. Validate the authorization URL against the configured Supabase origin and `/auth/v1/authorize` path before opening it.
5. Permit one pending attempt for five minutes, consume it before exchange, and require a fresh attempt after cancellation/error/expiry. Do not enable experimental multi-flow support or add a guessed custom state protocol.
6. Re-run targeted tests (expected PASS).
7. Checkpoint commit: `feat(auth): validate browser auth callbacks`.

## Task G: Mount one provider and guard all route groups

**Files:**

- Create: `src/features/auth/context/AuthProvider.tsx`
- Create: `src/features/auth/context/useAuth.ts`
- Create: `src/features/auth/services/restore-session.ts`
- Create: `src/features/auth/context/__tests__/AuthProvider.test.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/index.tsx`
- Create: `app/(public)/_layout.tsx`
- Create: `app/(onboarding)/_layout.tsx`
- Create: `app/(protected)/_layout.tsx`
- Create: `app/(protected)/index.tsx`

1. Test cold starts, one subscription, teardown, AppState refresh start/stop, provisional `getSession`, online `getUser`, transient offline recovery, revoked refresh, repair, onboarding routing, stale-generation rejection, and account-switch cleanup.
2. Run `npm run test:run -- AuthProvider`.
3. Expected red result: provider/services/routes are missing.
4. Implement one root provider. Defer async work out of `onAuthStateChange` callbacks and discard results from older operation/user generations.
5. Guard each route group independently so direct navigation cannot bypass onboarding. Keep the protected index a minimal ready/logout placeholder; M04 owns the dual-mode shell.
6. If profile state uses TanStack Query, install it here, include user ID in every key, and remove only prior-user keys. Otherwise maintain only a user-keyed profile-gate snapshot and do not claim a general cache exists.
7. Run targeted tests and `npm run test:run` (expected PASS).
8. Checkpoint commit: `feat(auth): add persistent session routing`.

## Task H: Implement public authentication and recovery screens

**Files:**

- Create: `app/(public)/sign-in.tsx`
- Create: `app/(public)/sign-up.tsx`
- Create: `app/(public)/forgot-password.tsx`
- Create: `app/(public)/auth/callback.tsx`
- Create: `app/(public)/auth/reset-password.tsx`
- Create: `src/features/auth/components/AuthForm.tsx`
- Create: `src/features/auth/components/AuthRecoveryScreen.tsx`
- Create matching component tests

1. Write tests for accessible labels/focus, busy duplicate prevention, password secrecy, normalized validation, generic invalid-credential copy, confirmation required, cooldown, provider cancel/deny, malicious/expired callback, and retry.
2. Run targeted component tests and confirm red failures.
3. Open Google auth with `WebBrowser.openAuthSessionAsync(authorizationUrl, "dowell://auth/callback")`; handle `success`, `cancel`, and `dismiss` explicitly. Never render or log the callback URL.
4. Require a validated recovery exchange/event before password update, then leave recovery mode and revalidate the user.
5. Render explicit loading/error/retry states and map all vendor errors at the gateway boundary.
6. Re-run targeted tests and `npm run test:run` (expected PASS).
7. Checkpoint commit: `feat(auth): add email and Google sign-in flows`.

## Task I: Implement server-backed onboarding

**Files:**

- Create: `app/(onboarding)/index.tsx`
- Create: `src/features/profile/components/OnboardingForm.tsx`
- Create: `src/features/profile/model/profile-schemas.ts`
- Create matching component/model tests

1. Write failing tests for required name/home area, trimmed boundaries, retry, RPC failure, idempotent completion, and direct protected-route rejection.
2. Submit only through `complete_onboarding`; never update `onboarding_completed_at` directly. Worker preferences remain optional/deferred.
3. On success, reload the profile, persist only the user-keyed gate snapshot, and transition to `ready` without changing identity or authorization.
4. Run targeted tests, `npm run test:run`, and `npm run test:auth:integration` (expected PASS).
5. Checkpoint commit: `feat(profile): add required onboarding flow`.

## Task J: Configure and prove hosted/device flows

**Files:**

- Modify: `README.md`
- Modify: `docs/AUTHENTICATION.md`
- Create: `docs/evidence/m03-device-checklist.md`

1. Configure the Google Web client callback shown by hosted Supabase, consent/test users, hosted provider, exact app redirects, hosted email confirmation, and the 12-character password policy. Do not put any value in repository text or terminal commands.
2. Rebuild/reinstall the development client if native configuration changed.
3. Verify the route mechanically with `npx uri-scheme open dowell://auth/callback --android`, then verify real browser completion.
4. Execute `docs/AUTHENTICATION.md:220-235`: Google success/cancel/denial/cold-start; email signup/confirmation/sign-in/reset/wrong password; restart/refresh/revocation/offline; malformed/duplicate callbacks; onboarding bypass; local logout; account switching.
5. Record only pass/fail, device/build versions, timestamps, and stable sanitized error codes—no PII, query URLs, screenshots of accounts, tokens, or secrets.
6. Checkpoint commit: `docs(auth): record M03 device verification`.

## Task K: Security/reviewer checkpoint

1. Ask the backend/security reviewer to inspect RPC ownership, grants, search paths, RLS, HTTP-path tests, and secret handling.
2. Ask the frontend reviewer to inspect callback parsing, one-time exchange, provider race handling, route guards, accessible forms, offline/revoked UX, and cleanup across account changes.
3. Resolve every high/medium finding; add a regression test before each fix.
4. Re-run the focused red/green proof and commit each cohesive correction with `fix(auth): ...`.

## Task L: Full verification, PR, and merge

**Files:**

- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify externally: issue #4 and the M03 pull request

1. Run the full gate:

   ```powershell
   git diff --check
   npm run format:check
   npm run lint
   npm run typecheck
   npm run test:run
   npm run db:reset
   npm run db:lint
   npm run db:test
   npm run db:test:performance
   npm run db:types:check
   npm run test:auth:integration
   npx expo-doctor
   npx expo install --check
   ```

2. Run a local Android development build/install because authentication changes native-facing behavior.
3. Scan tracked/staged files and resolved public Expo config for provider secrets, privileged Supabase keys, access/refresh tokens, personal email, and callback query data. Report counts only.
4. Update issue #4 and durable docs with exact verification evidence. Keep M03 `IN PROGRESS` unless all hosted/device blockers are cleared.
5. Push `feat/supabase-auth`, open one cohesive PR, wait for CI/security checks, and request explicit owner approval before merge.
6. After merge only, use a closeout docs change to mark M03 complete and point the handoff to M04.

## Acceptance mapping

| Requirement | Primary proof |
|---|---|
| Google browser OAuth works on device | Tasks F, H, J: strict parser tests plus real physical-device completion/cancel/denial/cold-start |
| Email/password signup, confirmation, sign-in, reset | Tasks C, E, H, J: local Auth HTTP integration, gateway/component tests, hosted mail/device checks |
| Invalid or malicious callback is rejected | Task F hostile-input table; Task J `uri-scheme` and real-browser negative cases |
| Valid sessions restore and refresh; revoked sessions expire safely | Tasks D, G provider/reducer tests; Task J restart/refresh/revocation matrix |
| Profile is created or repaired exactly once | Task B pgTAP idempotency; Task C real Auth/JWT integration |
| Incomplete users cannot bypass onboarding | Task B server RPC/grant tests; Tasks G/I route tests; existing draft-gig RLS test; Task C JWT proof |
| Offline restoration has explicit behavior | Tasks D/G reducer/provider tests; Task J device offline test |
| Logout removes local session and prior-user state without global signout | Tasks E/G unit tests; Tasks C/J integration/device checks |
| One account keeps one identity across modes | Profile/user ID assertions in Tasks C/I; M04 owns full mode navigation |
| Secrets and tokens never enter client config/logs/Git/evidence | Tasks A/C/E/H/J constraints; Task L tracked/build scan |
| Existing authorization/performance remains intact | Task L full pgTAP, query-plan, type-drift, lint/typecheck/unit gates |

## Rollback paths

- Disable the Google entry point while preserving email/password if provider/redirect configuration fails.
- Clear only app-owned local auth state and return to sign-in for corrupt/revoked sessions.
- Revoke RPC execute permissions in a forward migration if a privilege flaw is found; do not rewrite applied migration history.
- Keep users at `restoring` when offline gate state is unknown; never grant readiness optimistically.
- Do not merge if physical-device OAuth, recovery, or secret scan is incomplete.

