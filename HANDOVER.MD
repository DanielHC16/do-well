# DO-WELL Project Handover

**Last audited:** 2026-10-26 (Asia/Manila)  
**Repository:** `DanielHC16/do-well` (private)  
**Default branch:** `main`  
**Audited commit:** `b5ace38` (latest `main`)
**Current execution branch:** `main` (`a9725e0` plus hosted parity evidence)
**Current phase:** Productization implementation: zero-secret CI workflow, server-owned admin capabilities, Settings, functional moderation console, dual Google/email authentication, idempotent operator provisioning, and end-to-end multi-principal HTTP workflow suite implemented and verified across 92 Jest test suites (538 tests), 2 HTTP integration suites, and 13 database test suites (253 pgTAP tests).

This is the first document a new developer or AI agent should read. It records the difference between what exists in source code, what has been locally verified, and what is actually available in the hosted environment. Do not infer live readiness from old milestone labels.

## 1. Product direction

DO-WELL is an Android-first neighborhood gig marketplace for Philippine communities. The intended live product supports one authenticated identity that can:

- find work in a worker workspace;
- offer work in an employer workspace;
- create and discover gigs;
- apply, select a worker, confirm an agreement, manage milestones, submit evidence, request revisions, and approve completion;
- continue safely through weak connectivity; and
- access an administrator console only when the server grants an administrator role.

The next objective is a fully presentable **hosted production demo**, not another synthetic MVP. Every visible action in the primary demo must perform a real operation or provide an honest actionable state. Internal milestone language, placeholder promises, and technical implementation disclaimers should not appear as product copy.

The isolated offline demo runtime may remain as a clearly disclosed disaster-recovery fallback. It must not be presented as proof of hosted authentication, synchronization, RLS, Storage, notifications, or a real multi-user workflow.

## 2. Mandatory startup procedure

Before changing anything:

1. Read `AGENTS.md`.
2. Read this file, `docs/README.md`, `docs/IMPLEMENTATION_ROADMAP.md`, and `docs/SESSION_HANDOFF.md`.
3. Inspect `git status --short --branch`, recent commits, the active issue, and the active PR.
4. Confirm the requested milestone and architecture are approved before implementation.
5. Never print, commit, or place local credentials in an Expo public variable.
6. Keep the external-service budget at PHP 0 / USD 0.
7. Use a short-lived branch, tests first, a reviewed PR, and green checks before merging.

Repository rules take precedence over this summary if they are stricter.

## 3. Audited state at a glance

| Area | Repository state | Hosted/presentation state | Disposition |
| --- | --- | --- | --- |
| Google authentication | PKCE browser OAuth, callback validation, session restoration, refresh, sign-out, and onboarding are implemented and locally tested | The designated owner Google identity exists, is confirmed, and has a completed profile; full emulator/physical-device acceptance remains deferred | Complete M03B acceptance before relying on it in a live demo |
| Email/password | Gateway, provider methods, and `AccountAccessScreen` with segmented Google & Email/Password tabs exist | Locally implemented and tested (92 suites passing) | Ready for hosted verification alongside Google OAuth |
| Worker/employer experience | Workspaces, switcher, and `AccountSettingsScreen` exist; preference persisted via `set_preferred_mode` RPC | User-selectable workspace preference stored in `profiles.preferred_mode` and local store | Preserved and enforced as self-service preference, not a security role |
| Administrator | Server-owned `account_roles`, `is_admin()`, `get_my_capabilities()`, `admin_actions`, and `AdminConsoleScreen` exist | Admin authority verified via RPCs; client never infers capability from email | Provision owner UUID in hosted `account_roles` after database migration |
| Marketplace backend | Twelve migrations define schema, RLS, Storage, and real workflow RPCs | Hosted migration history stops after the first four migrations; eight workflow migrations (`20261025000100` through `20261026000100`) are unapplied | Back up, review, apply, and verify hosted migration parity before live workflow testing |
| Hosted data | Local seed and extensive SQL fixtures exist | One profile; zero gigs, applications, assignments, milestones, submissions, activity events, and reports | Provision a controlled live demo scenario using real identities |
| Core mobile flows | Real gateways/screens exist for gigs through completion | Verified locally via end-to-end multi-principal HTTP integration test (`tests/integration/production-workflow-http.test.ts`) across 14 lifecycle steps | Ready for hosted device acceptance |
| Evidence | Private Storage architecture, immutable upload recovery, server-side object verification, signed reads, and Storage API upload RLS parity verified | Verified via local HTTP integration test including binary JPEG upload and manifest finalization | Ready for hosted device rehearsal |
| Connectivity | Offline banner, bounded caches, drafts, timeouts, and reconciliation exist | Device/network rehearsal still needed | Verify without claiming unattended background sync |
| Notifications | Local recipient-activity alerts and deep-link handling exist | These are local notifications, not remote push | Present them accurately and test on device |
| Brief builder | Deterministic structured brief generation works; an optional provider adapter exists | Default runtime has no genuine inference provider | Call it “Brief Builder” unless a real provider is configured and accepted |
| Admin reports | `reports`, `admin_actions`, `submit_report`, `list_admin_reports`, `decide_admin_report`, `CreateReportScreen`, and `MyReportsScreen` exist | Full reporting flow, user report queue, moderation console, resolution notes, and immutable audit trail verified locally over HTTP | Ready for hosted apply |
| Automated verification | Format, lint, strict types, Jest (92 suites / 538 tests), SQL tests (13 suites / 253 tests), HTTP integration tests (2 suites), Expo doctor (20/20), Android Hermes export, and GitHub Actions CI workflow exist | `.github/workflows/ci.yml` created with zero-secret PR verification | Verified by `tests/config/ci-workflow.test.js` and local execution |
| Offline demo | Explicit, isolated synthetic runtime exists | Old runbook treats it as the primary story and contains UI/feature inaccuracies | Retain only as a labelled fallback and rewrite the runbook |

## 4. Fresh verification evidence

The Section 11 execution attempt on 2026-10-26 produced the following current evidence:

- `npm ci` completed successfully and restored the locked dependencies.
- `npm run test:run` — 92 suites, 538 tests passing.
- `npm run format:check` — clean.
- `npm run lint` — clean.
- `npm run typecheck` — clean.
- `npx expo-doctor` — 20/20 checks passed.
- `npx expo export --platform android` — passed with `CI=1` and `EXPO_NO_TELEMETRY=1`; Hermes bundle generated (4.9MB).
- `npm run db:test` — blocked because Docker is unavailable and local Postgres at `127.0.0.1:55322` is not reachable.
- `npm run test:auth:integration` — blocked by the same unavailable local Supabase environment.
- Hosted migration inspection and dry-run — completed after linking the project; the dry-run identified eight pending migrations.
- Hosted migration apply — completed successfully for `20261025000100` through `20261026000100`; a subsequent migration list confirmed local/remote parity.
- Hosted schema backup — blocked because `supabase db dump --linked` requires Docker, which is unavailable on this machine.
- Operator provisioning dry-run — completed against hosted Supabase using the configured secret under the script's required process-local `SUPABASE_SERVICE_ROLE_KEY` name. No changes were applied. The counterpart worker was reported as `not_found`/`create_and_onboard`; the admin was `none specified` because `DEMO_ADMIN_EMAIL` is not configured.
- Hosted operator apply — not run; an owner/admin email must be explicitly configured before granting server-side administrator authority.
- Android device preparation — the existing Android SDK and configured `Pixel` AVD were used; the emulator booted as `emulator-5554`.
- Native APK installation — blocked by Windows CMake/Ninja path-length failures in React Native codegen. CMake 3.31.6 was installed into the local SDK and an arm64 release build was retried from progressively shorter temporary paths, but the generated native build still failed before producing an installable APK. No tracked source was changed by these attempts.

The previously recorded historical verification below remains valid for the commit on which it was run; it must not be interpreted as fresh hosted-environment evidence.

The following commands passed on 2026-10-26 on `main` (`98614ca`):

- `npm run format:check` — clean Prettier formatting across all files
- `npm run lint` — 0 ESLint errors
- `npm run typecheck` — 0 TypeScript compiler errors (`tsc --noEmit`)
- `npm run test:run` — 92 suites, 538 tests passing
- `npm run test:auth:integration` — 2 suites, 2 integration tests passing over real HTTP
- `npm run db:test` — 13 test suites, 253 pgTAP tests passing
- `npm run db:lint` — 0 database schema warnings
- `npm run db:types:check` — generated types current with zero drift
- `npx expo-doctor` — 20/20 checks passed
- `npx expo export --platform android` — Hermes bytecode bundle generated without errors (4.9MB)

Read-only hosted inspection before the parity apply established:

- migrations `20261022000100` through `20261023000100` are applied remotely;
- migrations `20261025000100` through `20261026000100` are not applied remotely;
- the designated owner Google identity exists as a confirmed user with a completed profile;
- that profile currently prefers the worker workspace;
- no administrator role exists to grant to that account; and
- hosted business tables are empty.

Hosted parity was subsequently applied on 2026-10-26. The hosted database now reports all twelve local migrations as applied.

Do not put the owner email into mobile authorization logic. Resolve the stable Auth user ID during an operator-only bootstrap step and store the role server-side.

## 5. What is genuinely implemented

### Identity and session

- Production is the default runtime. The offline runtime is enabled only through `EXPO_PUBLIC_APP_RUNTIME=demo`.
- Google browser OAuth uses PKCE and validates callback origin/state.
- The root auth provider restores and refreshes sessions, gates onboarding, handles account changes, and purges scoped local data on sign-out.
- Profile repair and onboarding use server RPCs and validated client contracts.
- Local HTTP integration exercises real Supabase Auth, JWTs, profile RLS, refresh, onboarding, and sign-out.

Relevant areas: `app/(public)`, `app/(onboarding)`, `src/features/auth`, `src/features/profile`, and `supabase/migrations/20261023000100_auth_profile_rpcs.sql`.

### Marketplace workflow

The production application has real screens, gateways, validation, SQL state transitions, RLS, and tests for:

1. employer gig creation, publish, close, and listing;
2. nearby/remote discovery and explainable ranking;
3. worker application and withdrawal;
4. atomic employer selection with competing-application rejection;
5. worker agreement confirmation or decline;
6. milestones and activity;
7. work submission, revision, and approval;
8. private image evidence; and
9. connectivity-aware caches, drafts, timeouts, and reconciliation.

This is a strong source-code foundation. It is not yet proof that the complete flow works in the current hosted project.

## 6. Material gaps and misleading claims

### Roadmap and handoff drift

- `docs/IMPLEMENTATION_ROADMAP.md` says all implementation milestones are complete while also marking hosted authentication/device acceptance M03B as deferred.
- `docs/SESSION_HANDOFF.md` points to PR #37 as the current merge even though `main` includes PR #39.
- `docs/ARCHITECTURE.md` describes TanStack Query as the server-state owner, but the dependency is absent and screens use direct effects/gateways.
- The roadmap claims CI, but `.github/workflows/ci.yml` does not exist.
- `docs/PRODUCT_REQUIREMENTS.md` still contains bootstrap-era statements and requirements that are not fully implemented, including email/password UI, gig editing, report capture, and genuine inference when marketed as AI.

Treat these as documentation defects to correct in the first productization milestone.

### The current “E2E” is not production E2E

`tests/e2e/competition-workflow.test.ts` drives the synthetic demo reducer. It does not launch Android, authenticate a real user, call hosted Supabase, test RLS over HTTP, upload Storage evidence, or navigate production screens. Rename/reclassify it and add a real integration/device journey.

### One account cannot demonstrate both sides of one transaction

All marketplace users may switch between worker and employer workspaces, but the database correctly prevents a person from applying to their own gig. Administrator status must not bypass this rule. A full live workflow requires at least two real authenticated principals, ideally two simultaneous emulator/device sessions.

### Presentation issues

The product has a distinctive cream, pine, rust, and yellow neighborhood-noticeboard visual language. Preserve it. The next frontend pass should remove development-facing wording and correct behavioral gaps rather than replace the design with a generic dashboard.

Known examples:

- technical RLS/mode explanations appear in product screens;
- notification copy discusses service cost instead of user value;
- the unmatched route says a feature “has not arrived yet”;
- “LIVE WORKSPACE” can appear even when content is stale;
- some failed requests are converted into legitimate empty states;
- protected routes can fall back to fabricated `Neighbor` identity data;
- the old demo runbook claims a dark theme, rating badges, bid input, and a sign-in demo button that do not match the app; and
- requesting `exif: false` prevents returned EXIF fields but does not by itself prove binary metadata removal.

Payment is intentionally outside DO-WELL. Keep that boundary truthful unless payment processing is actually implemented.

## 7. Governing account architecture

Keep these three concepts separate:

```text
Supabase Auth identity
  ├─ marketplace workspace preference: worker | employer
  └─ server authorization capability: user | admin
```

### Identity

One Supabase Auth user and one application profile. Google is the recommended immediate demo path.

### Worker/employer workspace

- Every active user may use both workspaces.
- The selection changes navigation/defaults, not database authority.
- Persist the preferred workspace to `profiles.preferred_mode` through a validated self-service RPC.
- Keep a user-scoped local copy only for resilience and startup speed.
- Expose the control in Settings as “Find work” and “Offer work,” not as security roles.

### Administrator capability

- Add a server-owned role table such as `account_roles(user_id, role, granted_at, granted_by)`.
- Add a private `is_admin()` authorization helper.
- Let a user read only their own capability through a narrow RPC such as `get_my_capabilities()`.
- Deny client insert/update/delete on roles.
- Bootstrap the owner’s stable Auth UUID through operator-only tooling after Google sign-in. Do not hard-code the email in the APK or compare email in the client.
- Enforce admin authorization independently inside every admin query/mutation.
- Record privileged changes in an immutable `admin_actions` audit table.
- Never ship a service-role/secret key in the mobile app.
- Never implement arbitrary user impersonation as a demo shortcut.

## 8. Recommended information architecture

```text
Home
Work
  ├─ Find Work
  └─ Offer Work
Activity
Account / Settings
  ├─ Profile
  ├─ Default workspace
  ├─ Location and privacy
  ├─ Notification preferences
  └─ Sign out
Admin Console (server-authorized users only)
  ├─ Overview
  ├─ Reports
  └─ Moderation history
```

The Admin Console should use the established noticeboard visual system with a restrained utility treatment. Do not use a generic AI-generated dashboard aesthetic.

## 9. Approved-direction roadmap awaiting owner confirmation

No implementation milestone below is approved merely because it appears here. Confirm scope, create an issue and detailed plan, then implement one milestone per branch/PR.

### M15 — Repository truth and productization reset

Goal: align claims, tests, architecture, CI, and the roadmap with reality.

- distinguish local implementation from hosted/device acceptance;
- reopen/complete M03B instead of declaring all work complete;
- correct CI, E2E, AI, admin, report, edit-gig, and demo claims;
- add a real CI workflow for format, lint, typecheck, Jest, database verification, and Android export;
- update the live demo runbook to match exact visible controls; and
- define a production-copy audit checklist.

### M16 — Hosted backend parity and Google acceptance

Goal: make the production runtime operable against the authorized hosted Supabase project.

- create a timestamped remote backup;
- dry-run and apply the seven reviewed workflow migrations;
- verify migration parity, RLS, RPC availability, Storage, and generated-type parity;
- accept Google sign-in, callback, onboarding, session restore, sign-out, and second sign-in on emulator;
- repeat the release-critical matrix on a physical Android device before final release; and
- explicitly approve Google-only scope or restore email/password UI to P0.

### M17 — Settings, workspace persistence, and admin foundation

Goal: implement the identity/workspace/capability model in Section 7.

- add server-owned roles, private admin checks, capability RPCs, and negative pgTAP tests;
- add server-authoritative preferred workspace persistence;
- extend auth/profile contracts with capabilities and preferred workspace;
- add the Account/Settings route and polished controls;
- add an admin route guard and conditional navigation entry; and
- perform the operator-only owner role bootstrap.

### M18 — Functional moderation

Goal: ensure the Admin Console is operational rather than decorative.

- add authenticated report submission;
- add admin-only queue, detail, resolve/dismiss, and optional gig takedown/restore operations;
- require moderation notes where appropriate;
- add immutable admin audit events; and
- verify every operation against non-admin and cross-user access.

Avoid account suspension unless the team explicitly wants to demonstrate it; if added, enforce status in every state-changing RPC rather than only hiding UI.

### M19 — Product and presentation completion

Goal: remove the remaining gap between working code and a finished product experience.

- implement gig editing and profile/settings editing if retained in P0;
- separate error, empty, loading, stale, offline, and recovery states;
- remove fabricated identity fallbacks;
- replace technical/development copy with clear product language;
- consolidate repeated UI primitives and hard-coded colors into design tokens;
- audit accessibility and small-screen behavior; and
- rename the deterministic feature to “Brief Builder” unless genuine model inference is active.

### M20 — Live demo environment and release acceptance

Goal: prove the real product story on Android.

- provision at least two real marketplace principals total: the owner/admin may act as one participant and a separate non-admin account as the counterpart; use a third dedicated marketplace account only if the team wants the admin excluded from the transaction;
- keep credentials outside Git in the approved secret store/local ignored files;
- seed a compact, realistic hosted scenario through supported operator tooling;
- add a local two-user Auth/PostgREST/Storage workflow test;
- add an Android app-level journey for login, workspace switch, gig, application, selection, agreement, evidence, revision/approval, reporting, and admin resolution;
- rehearse with two simultaneous sessions/devices;
- build/install the production-runtime APK; and
- retain the disclosed offline runtime only as a contingency.

## 10. Recommended immediate decisions

The owner should confirm these before M15/M16 implementation:

1. **Authentication:** Google-only for the immediate demo, or Google plus email/password?
2. **Admin scope:** moderation and operational visibility only, or user/content management too?
3. **Test identities:** may the team provision at least one additional real non-admin account so two distinct principals can complete the marketplace lifecycle?
4. **Brief builder:** rename the deterministic feature now, or require genuine inference before presentation?

Recommended defaults:

- Google-only for the immediate live demo;
- admin limited to reports, content moderation, and operational counts;
- two distinct real marketplace principals total, with an optional third dedicated account;
- “Brief Builder” until genuine inference is configured and accepted.

## 11. Exact next action for the next agent

The M15-M20 implementation baseline is merged into `main` with 92 passing Jest test suites (538 tests), 2 real HTTP integration suites, 13 pgTAP database test suites (253 tests), zero typecheck/lint errors, and Android Hermes bundle export verified. The codebase now contains:
- Zero-secret continuous integration workflow (`.github/workflows/ci.yml`).
- Server-owned `account_roles` and `admin_actions` audit schema (`supabase/migrations/20261026000100_admin_roles_and_reporting.sql`).
- Storage policy parity for direct test fixtures and Supabase Storage API direct HTTP uploads.
- Full pgTAP test contract (`supabase/tests/130_admin_roles_reporting.test.sql`).
- Account settings with self-service workspace preference persistence (`AccountSettingsScreen.tsx`).
- Functional noticeboard-styled moderation console (`AdminConsoleScreen.tsx`).
- Dual-mode Google and Email/Password sign-in/sign-up screen (`AccountAccessScreen.tsx`).
- Header Settings cog and conditional Admin Console entry in `MarketplaceShell.tsx`.
- Idempotent operator demo provisioning script (`scripts/provision-demo-environment.cjs`, `scripts/provision-demo-environment.mjs`, unit tested in `scripts/__tests__/provision-demo-environment.test.js`).
- Complete operator hosted setup and execution manual (`docs/HOSTED_DEMO_SETUP.md`).
- Multi-principal HTTP integration test (`tests/integration/production-workflow-http.test.ts`) covering all 14 lifecycle steps over real HTTP endpoints.

The exact technical sequence for the next agent is:

1. **Hosted Migration Parity**:
   - Restore Docker Desktop and create the ignored `.env.local` with active hosted operator credentials.
   - Link the repository to the authorized Supabase project before running migration commands.
   - Follow `docs/HOSTED_DEMO_SETUP.md` to capture a timestamped backup of hosted schema before pushing.
   - Apply pending migrations `20261025000100` through `20261026000100` to hosted Supabase.
   - Verify RPC availability (`get_my_capabilities`, `set_preferred_mode`, `submit_report`, `list_admin_reports`, `decide_admin_report`).
2. **Operator Demo Provisioning**:
   - Run `node scripts/provision-demo-environment.mjs --target hosted --dry-run` to preview operations.
   - Run with `--apply` to provision the counterpart demo worker and grant owner admin capabilities.
   - Credentials and user IDs are output to `.codex-artifacts/demo-accounts.json` (gitignored).
3. **Dual-Principal Live Journey Rehearsal**:
   - Follow the dual-device live rehearsal procedure in `docs/HOSTED_DEMO_SETUP.md`:
     - Device 1: Sign in as owner/employer; create and publish a neighborhood gig.
     - Device 2: Sign in as demo worker; discover the gig and apply.
     - Device 1: Select demo worker.
     - Device 2: Confirm agreement.
     - Device 1: Start milestone.
     - Device 2: Upload evidence photo and finalize submission.
     - Device 1: Approve submission and complete gig.
     - Device 2: Submit a report.
     - Device 1: Open Admin Console from header, view report, and record resolution note.
4. **Physical Device Build & Release**:
   - Run `npx expo export --platform android`.
   - Build and verify production APK on Android physical device/emulator per `docs/COMPETITION_BUILD.md`.
   - If the Windows native build hits the React Native CMake path-length limit, use a real short checkout path (not a junction) or build on a host with Windows long-path support enabled; the current emulator is available but has no installed app yet.

## 12. Security and operations reminders

- Local `.env.local`, OAuth downloads, database passwords, Supabase secrets, and signing material are ignored and must never be copied into this document, issues, PRs, logs, screenshots, or client code.
- Previously shared hosted credentials should be rotated before a real release.
- The local env currently contains a misspelled legacy secret variable name that is included in secret-exposure tests. Normalize local configuration during an authorized secrets-maintenance step without printing values.
- Use additive forward migrations. Correct production schema with a forward fix rather than destructive rollback.
- Back up hosted schema/data before the first productization migration apply.
- The project has no approved paid service and no billing method should be added.
- If an operation requires service-role privileges, run it through operator tooling or a narrowly scoped server boundary—not the mobile client.

## 13. Reference map

- Product scope: `docs/PRODUCT_REQUIREMENTS.md`
- Architecture: `docs/ARCHITECTURE.md`
- Database: `docs/DATABASE_SCHEMA.md`
- Security/RLS: `docs/SECURITY_AND_RLS.md`
- Authentication: `docs/AUTHENTICATION.md`
- Android integrations: `docs/ANDROID_INTEGRATIONS.md`
- Offline behavior: `docs/OFFLINE_STRATEGY.md`
- Cost policy: `docs/FREE_TIER_AND_COST_POLICY.md`
- Decision register and ADRs: `docs/DECISIONS.md`, `docs/adr/`
- Old delivery roadmap: `docs/IMPLEMENTATION_ROADMAP.md`
- Previous operational handoff: `docs/SESSION_HANDOFF.md`
- Current demo script requiring correction: `docs/DEMO_RUNBOOK.md`
- Dependency/security audit: `docs/reports/2026-10-25-dependency-audit-disposition.md`

## 14. Verified local unblocking continuation (2026-10-26)

This section supersedes the older installation and migration instructions in Section 11. Work is on `chore/local-build-unblocking`, based on `88cbfbf`. Hosted migration parity is already verified through `20261026000100`; preserve the existing ignored environment/linkage and inspect history before any further migration action.

- Windows long paths are enabled. With `-Pexpo.android.cmakeObjectPathMax=240`, the `x86_64` release APK built successfully in 5m39s (879 tasks), passed APK v2 signature verification, installed successfully, and cold-launched on `emulator-5554` (`Status: ok`, 1526ms).
- Preserved ignored emulator artifact: `.codex-artifacts/do-well-emulator-x86_64.apk`; SHA-256 `DFA8D1C18DB49360A3D8ECA02B1A2BD18168C3EFCFBEE63BE4FE3549D678A721`. The separate ARM64 build succeeded in 2m46s and passed APK v2 signature and architecture checks: `.codex-artifacts/do-well-android-arm64.apk`, SHA-256 `828BDAC6CC1582604941E7168D9A3E172A86ECE1CE3B201C438DAE8CD9311F06`. Both APKs use the generated development signing key. No physical phone is connected; physical-device installation and acceptance remain unverified.
- Docker Desktop `4.96.3`, Docker CLI `29.9.2`, and WSL `3.0.3` are installed. Docker Desktop was launched but the engine is unavailable. Windows must restart to activate WSL/VirtualMachinePlatform; then start Docker Desktop, verify `docker info`, and rerun local database and HTTP integration checks.
- The owner subsequently supplied the exact authorized admin email, now configured only in ignored `.env.local`. A fresh hosted dry-run returned admin `user_not_found` / `require_user_login`; the owner must sign in with that Google account before granting its role. The worker remains `not_found` / `create_and_onboard`. No provisioning apply, counterpart-worker creation, or administrator grant occurred.
- No billing was enabled and no secrets were exposed. Hosted two-principal rehearsal, hosted OAuth acceptance, and physical-device acceptance remain pending. See `docs/SESSION_HANDOFF.md` for continuation commands and `docs/COMPETITION_BUILD.md` for reproducible Windows build commands.
