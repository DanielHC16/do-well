# Session Handoff

## Snapshot

- **Last verified:** 2026-10-25 (Asia/Manila)
- **Completed milestones:** M01 — Expo initialization and Android development proof; M02 — Supabase schema and authorization foundation; M03A — authentication foundation; D01 — Offline Demo Preview; M04 — Authenticated marketplace shell and dual-mode navigation
- **Current milestone:** M05 — Gig creation and employer management
- **Status:** `IN PROGRESS` on branch `feat/gig-management`; RPC lifecycle migrations, pgTAP tests, gig schemas/draft store/gateway, gig form & detail screens, and route integration completed and verified
- **Branch:** `feat/gig-management`
- **Base/default branch:** `main`
- **Current implementation merge:** `b75a13e` (`Merge pull request #26`)
- **Remote:** `https://github.com/DanielHC16/do-well` (`PRIVATE`)
- **Next issue:** [#6 — [M05] Build gig creation and employer management](https://github.com/DanielHC16/do-well/issues/6)
- **M01 PR:** [#17](https://github.com/DanielHC16/do-well/pull/17), squash-merged as `d073c4b`
- **M02 PR:** [#19](https://github.com/DanielHC16/do-well/pull/19), merge commit `f7a3317`
- **M03A PR:** [#22](https://github.com/DanielHC16/do-well/pull/22), merged as `368613a`
- **D01 PR:** [#24](https://github.com/DanielHC16/do-well/pull/24), merged as `d7092c3`
- **M04 PR:** [#26](https://github.com/DanielHC16/do-well/pull/26), merged as `b75a13e`

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
- The authorized hosted Supabase project is linked locally through ignored CLI state. On 2026-10-25, a schema/data backup and `db push --dry-run` were captured under ignored `.codex-artifacts/`, then all four reviewed migrations were applied without seed data.
- Remote migration history now matches `20261022000100`, `20261022000200`, `20261022000300`, and `20261023000100`. The hosted public schema was empty before the push, so no pre-existing application object was overwritten.
- Hosted credentials remain only in ignored local configuration. Rotate the access token and database password after development because they were shared in conversation.
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

## M04 completed state

- M04 merged into `main` via PR #26 (`b75a13e`).
- Shell mode schema, AsyncStorage per-user mode persistence, context provider, and retry boundaries implemented in `src/features/shell/`.
- Noticeboard marketplace shell with top bar brand strip, dual-mode switcher (`worker` vs `employer`), and bottom navigation tab list (`Home`, `Activity`, `Profile`).
- Protected routes created under `app/(protected)/`: `_layout.tsx`, `index.tsx`, `worker.tsx`, `employer.tsx`, `activity.tsx`, `profile.tsx`, and `[...unmatched].tsx`.
- Verification passed: 37 Jest test suites / 182 tests passing, clean TypeScript strict typecheck (`tsc --noEmit`), clean Prettier, clean ESLint, and 20/20 `expo-doctor` checks.

## M05 implementation checkpoint

- Security-definer RPCs `publish_gig(uuid)` and `close_gig(uuid)` with `search_path = ''`, ownership checks, status transition enforcement, and `activity_events` audit logging implemented in `supabase/migrations/20261025000100_gig_lifecycle_rpcs.sql`.
- Database tests in `supabase/tests/070_gig_management_rpcs.test.sql` verify happy paths, non-owner rejections, invalid status transitions, and audit records (7 pgTAP files / 86 tests passing).
- Generated database types updated and verified via `scripts/database-types.mjs`.
- Domain validation in `src/features/gigs/model/gig-schemas.ts` covers 8 categories, 3 work modes, budget rules, and area constraints.
- Local draft persistence in `src/features/gigs/data/gig-draft-store.ts` via AsyncStorage.
- Gateway service in `src/features/gigs/data/gig-gateway.ts` handles draft CRUD, RPC execution, and type-safe row mapping.
- Screens implemented: `GigFormScreen.tsx` with draft loading and AI brief disclaimer (deferred to M10), and `EmployerGigDetailScreen.tsx` with publish and close actions.
- Navigation routes wired: `app/(protected)/employer/gigs/new.tsx` and `app/(protected)/employer/gigs/[gigId].tsx`.
- Noticeboard updated: `AuthenticatedHomeScreen.tsx` shows employer's posted notices and link to gig creation.
- Quality verification: 42 Jest suites / 212 tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## Open product decisions

- Approve or revise the provisional eight-category list before M05.
- Define cancellation authority and outcomes for each active workflow state.
- Confirm the assignment/agreement acceptance sequence.
- Set evidence and abandoned-upload retention periods before M09 cleanup behavior is implemented.

## Demo-first pivot

- The owner approved an isolated offline demo runtime on 2026-10-25 so the core product story can be demonstrated before hosted authentication is accepted.
- ADR 0006 and `docs/plans/2026-10-25-demo-first-mvp.md` govern D01.
- D01 uses fictional personas, synthetic local data, validated AsyncStorage persistence, deterministic reset, and a permanent demo disclosure.
- D01 must not be described as proof of real authentication, cloud synchronization, RLS enforcement, uploads, GPS, payments, identity verification, or AI inference.
- Production auth remains the default runtime and its deferred acceptance gates remain tracked as M03B.

## Exact next steps

1. Commit M05 changes in small, logical Conventional Commits.
2. Push branch `feat/gig-management` to GitHub.
3. Open Pull Request for M05 linking Issue #6 with full test evidence.
4. Merge M05 pull request into `main`.
5. Begin M06: Nearby/remote discovery and explainable ranking (Issue #7).

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
