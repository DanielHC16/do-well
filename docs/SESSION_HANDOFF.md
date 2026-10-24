# Session Handoff

## Snapshot

- **Last verified:** 2026-10-25 (Asia/Manila)
- **Completed milestones:** M01 — Expo initialization and Android development proof; M02 — Supabase schema and authorization foundation
- **Current milestone:** M03 — Authentication, session restoration, and profile onboarding
- **Status:** `IN PROGRESS`; Tasks A-I are implemented except the owner-approved Google-only narrowing of Task H; hosted/physical-device acceptance remains open
- **Branch:** `feat/supabase-auth`
- **Base/default branch:** `main`
- **Current implementation merge:** `f7a3317` (`Merge pull request #19`)
- **Remote:** `https://github.com/DanielHC16/do-well` (`PRIVATE`)
- **Next issue:** [#4 — M03 Implement authentication, session restoration and profile onboarding](https://github.com/DanielHC16/do-well/issues/4)
- **M01 PR:** [#17](https://github.com/DanielHC16/do-well/pull/17), squash-merged as `d073c4b`
- **M02 PR:** [#19](https://github.com/DanielHC16/do-well/pull/19), merge commit `f7a3317`

This file records repository evidence, not chat state. Re-run the verification commands before relying on it.

## M01 closeout

M01 is merged. The Expo SDK 58 app, strict TypeScript/Jest checks, local Android development build, and emulator/physical-device launch proof are on `main`. The authorized Infinix X6840/API 36 evidence remains at [`docs/evidence/m01-physical-device.png`](evidence/m01-physical-device.png).

## M02 completed state

- Supabase CLI `2.121.0` is pinned as a project development dependency and exposed through `db:start`, `db:stop`, `db:reset`, `db:lint`, `db:test`, `db:types`, and `db:types:check`.
- Docker runs the disposable local stack on isolated ports `55320`-`55329` plus Edge Runtime inspector `5583`.
- Ordered migrations currently define the schema foundation, RLS/grants, and private `submission-evidence` Storage policies.
- Local seed fixtures, pgTAP tests, generated database types, and their drift-check script exist.
- Workflow RPC names remain architectural contracts only. Real transactional functions are deferred to their workflow milestones; direct workflow mutation remains fail-closed rather than using no-op RPCs.
- The eight-category list is provisional and held in a named check constraint for a backward-compatible future allowlist migration.
- `activity_events.event_type` currently enforces conservative lowercase snake-case syntax; workflow milestones will add semantic event allowlists.

## Verified M02 evidence

- `npm run db:reset` passed twice from the local migration chain.
- `npm run db:test` passed 5 pgTAP files / 50 tests; `npm run db:test:performance` separately passed 5 query-plan assertions over 10,000 gigs and 50,000 applications.
- `npm run db:lint` reported no schema errors, and `npm run db:types:check` confirmed the generated types are current.
- Real JWT integration through the local HTTP/Auth path is deferred to M03; current policy tests use database role/claim impersonation.

## Local and external state

- Docker Desktop is required for all database commands.
- `.env.local` remains ignored and must contain valid dotenv assignments only; do not place PowerShell syntax in it.
- No hosted Supabase project was linked and no remote migration was applied.
- No billing, payment method, cloud build, or paid service was enabled.
- Local environment and OAuth credential files may be used when required, but their values must never be printed, logged, committed, or exposed through privileged `EXPO_PUBLIC_*` variables.

## M03 implementation checkpoint

- Public Supabase configuration is validated, the React Native client uses PKCE with URL auto-detection disabled, and provider tokens are removed at the persistence boundary.
- Expo Crypto now supplies the React Native WebCrypto capabilities required by Supabase Auth, and a real-client regression test proves OAuth authorization URLs use `code_challenge_method=s256` rather than the insecure plain fallback.
- Secure profile repair/completion RPCs and real local Auth/JWT integration coverage are committed.
- The client auth reducer rejects stale operation/account results and keeps vendor messages outside renderable state.
- Auth/profile gateways normalize input, validate provider/database output, use local-only sign-out, and convert unexpected boundary failures to stable application errors.
- OAuth, email-confirmation, and password-recovery callbacks use exact app routes and one typed five-minute pending attempt. Attempts are consumed before code exchange and cannot be replayed.
- Supabase authorization URLs require the configured exact origin, `/auth/v1/authorize`, Google provider, and the exact application callback.
- Independent review findings about stale generations and raw gateway failures were fixed in `f8c9101`.
- One root provider now restores and refreshes sessions with operation-generation guards, protects every route group, and keeps a minimal non-authoritative profile-gate snapshot partitioned by user ID.
- Google browser sign-in has accessible pending/error states, strict authorization/callback validation, one-time attempt consumption, cold-start handling, and foreground callback coalescing. Email/password and recovery UI are intentionally deferred by the owner's Google-only instruction; the gateway contracts remain available.
- Required onboarding validates bounded inputs, calls only the server RPC, remains retryable on failure, reloads the authoritative profile, and rejects direct protected-route bypass.
- On the `medium_phone` Android emulator, the development APK built, installed, bundled, and previously opened the Google browser flow to Google's account re-verification screen. After adding Expo Crypto, a fresh native build autolinked the module and launched without the WebCrypto downgrade warning. The fresh emulator session reported Auth unavailable even though the hosted Auth health endpoint returned HTTP 200 from the workstation, so emulator connectivity/config diagnosis, fresh end-to-end OAuth proof, the account-owned credential step, and the physical-device matrix remain acceptance blockers.
- Latest verification: formatting, lint, strict typecheck, 23 Jest suites / 122 tests, local Auth/JWT integration, 6 pgTAP files / 69 database tests, database lint/type drift, and all 20 Expo Doctor checks pass. The Android debug build completed successfully after the native dependency change.

## Open product decisions

- Approve or revise the provisional eight-category list before M05.
- Define cancellation authority and outcomes for each active workflow state.
- Confirm the assignment/agreement acceptance sequence.
- Set evidence and abandoned-upload retention periods before M09 cleanup behavior is implemented.

## Exact next steps

1. Diagnose why the fresh emulator reports Auth unavailable while the hosted health endpoint is HTTP 200, complete Google account re-verification interactively, then run Google success, cancel, denial, cold-start, restart, revocation, offline, duplicate callback, onboarding, logout, and account-switch cases without recording PII or callback URLs.
2. When physical-device testing resumes, execute the full M03 device matrix in `docs/AUTHENTICATION.md`; decide whether the Google-only scope permanently replaces email/password acceptance before marking M03 complete.
3. Keep hosted configuration changes and credential values out of Git, commands, logs, screenshots, issues, and PR text.
4. Keep PR #22 draft and unmerged until its hosted and physical-device acceptance gates are verified or the approved milestone acceptance contract is formally revised.

## Suggested continuation commands

```powershell
git status --short --branch
git diff --check
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
npm run db:types:check
npm run format:check
npm run lint
npm run typecheck
npm run test:run
```

## Stop conditions

Stop and update the active milestone issue instead of improvising if a step asks for a hosted Supabase link/apply, destructive remote migration, billing/payment setup, a privileged key in client code, history rewrite, production deployment, or an unresolved cancellation/agreement/retention decision.
