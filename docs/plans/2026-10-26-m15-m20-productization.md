# M15-M20 Production Demo Productization Implementation Plan

> **For Claude:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Convert the locally verified DO-WELL codebase into an honest, hosted, multi-account Android demo with real authentication, user-selected worker/employer workspace, server-granted administrator authority, Settings, reporting/moderation, reproducible demo data, and current documentation.

**Architecture:** Keep the existing Expo/Supabase modular monolith. Separate Supabase identity, user-selectable workspace preference, and server-controlled administrator capability; enforce every privileged action in PostgreSQL RPCs/RLS, and keep secrets/operator provisioning outside the mobile bundle. Production remains the primary runtime and the synthetic offline runtime remains a clearly labelled recovery fallback.

**Tech Stack:** Expo SDK 58, React Native 0.88, Expo Router, strict TypeScript, Zod, Supabase Auth/PostgreSQL/RLS/Storage, Jest 30 + `jest-expo`, React Native Testing Library 14, pgTAP, GitHub Actions.

---

## Decision and delivery constraints

- The owner approved M15-M20 implementation on 2026-10-26.
- Immediate authentication scope is Google plus the existing email/password gateway exposed through a real UI, because reproducible counterpart demo accounts need a non-Google login path.
- “Worker” and “Employer” are initial/default workspace choices available to every active user. They are not authorization roles.
- “Admin” is a separate server-owned capability that users cannot select during signup or Settings.
- The designated owner is granted admin by stable Auth UUID through operator tooling after migration. Never authorize by email in client code.
- Minimum live scenario: two distinct authenticated principals. The owner/admin may be one marketplace participant; a separate non-admin account is the counterpart. A third identity is optional.
- Initial admin scope: real counts, report queue/detail, resolve/dismiss with notes, and immutable audit history. Arbitrary impersonation, raw SQL, secret keys, and broad account mutation are excluded.
- Default deterministic generator is presented as **Brief Builder**, not live AI inference.
- Hosted changes are additive and forward-only. Back up before `db push`; do not run destructive rollback SQL.
- External-service budget remains PHP 0 / USD 0. Do not add billing or a payment method.

## Batch map

| Batch | Milestones | Exit gate |
| --- | --- | --- |
| A | M15 | Repository claims, CI, architecture decisions, and roadmap reflect reality |
| B | M17 backend + M18 backend | Local reset/pgTAP proves roles, workspace preference, reports, moderation, and audit boundaries |
| C | M16 + M17 frontend | Real auth/signup/onboarding, Settings, capability guard, and hosted parity are operational |
| D | M18 frontend + M19 | Reporting/Admin UI and polished production copy/states are functional |
| E | M20 | Idempotent demo provisioning, hosted smoke proof, Android export/device runbook, and handover are current |

Each batch gets an independent review checkpoint. Do not apply hosted migrations until Batch B has passed all local database gates and the migration diff has been independently reviewed.

### Task 1: Record the productionization contract (M15)

**Files:**
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PRODUCT_REQUIREMENTS.md`
- Modify: `docs/DECISIONS.md`
- Create: `docs/adr/0008-identity-workspace-and-admin-capabilities.md`
- Modify: `HANDOVER.MD`

**Step 1: Write the documentation acceptance checklist**

Add an M15-M20 matrix that distinguishes `IMPLEMENTED LOCALLY`, `HOSTED`, and `DEVICE ACCEPTED`. State explicitly that old M00-M14 completion does not imply M03B or hosted workflow acceptance.

**Step 2: Record the architecture decision**

ADR 0008 must define:

```text
Identity: Supabase Auth user
Workspace preference: worker | employer (self-service, non-security)
Capability: user | admin (server-owned, privileged)
```

Include consequences: two principals for a marketplace transaction, operator-only admin bootstrap, no email authorization, no client secret.

**Step 3: Correct stale architecture claims**

- Replace the unimplemented TanStack Query assertion with the current gateway/effect/cache architecture or explicitly schedule a separate query-layer migration.
- Mark email/password UI, gig editing, reporting, hosted OAuth, CI, and production E2E accurately.
- Reclassify the reducer workflow test as a domain journey rather than device E2E.

**Step 4: Verify internal consistency**

Run:

```powershell
git diff --check
Select-String -Path docs\*.md,HANDOVER.MD -Pattern "all.*milestones.*complete|TanStack Query|competition E2E"
```

Expected: no whitespace errors; every remaining claim is contextualized rather than presented as current hosted proof.

**Step 5: Commit**

```powershell
git add HANDOVER.MD docs
git commit -m "docs: define production demo productization program"
```

### Task 2: Add zero-secret continuous integration (M15)

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Modify: `docs/DEVELOPMENT_WORKFLOW.md`

**Step 1: Write a failing repository test**

Create `tests/config/ci-workflow.test.js` that reads `.github/workflows/ci.yml` and asserts pinned Node, `npm ci`, format, lint, typecheck, Jest, local Supabase reset/test/lint/types, Expo Doctor, and Android export commands exist. Assert no `${{ secrets.* }}` reference is required for pull-request verification.

**Step 2: Verify RED**

Run:

```powershell
npm run test:run -- --runTestsByPath tests/config/ci-workflow.test.js
```

Expected: FAIL because the workflow does not exist.

**Step 3: Implement the workflow**

Use `actions/checkout`, `actions/setup-node` with `.nvmrc` and npm cache, `npm ci`, local verification, Supabase CLI from the pinned package, and `npx expo export --platform android`. Do not add hosted credentials. Upload only non-sensitive failure/build artifacts with short retention.

**Step 4: Verify GREEN**

Run the targeted test, then:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test:run
```

Expected: all exit 0.

**Step 5: Commit**

```powershell
git add .github/workflows/ci.yml tests/config/ci-workflow.test.js package.json docs/DEVELOPMENT_WORKFLOW.md
git commit -m "ci: verify mobile and database contracts"
```

### Task 3: Define roles, admin audit, and self-service workspace preference (M17 backend)

**Files:**
- Create: `supabase/migrations/20261026000100_admin_roles_and_settings.sql`
- Create: `supabase/tests/130_admin_roles_and_settings.test.sql`
- Modify: `package.json`
- Regenerate: `src/types/database.generated.ts`
- Modify: `docs/DATABASE_SCHEMA.md`
- Modify: `docs/SECURITY_AND_RLS.md`

**Step 1: Write failing pgTAP contracts**

Cover:

- `account_roles(user_id, role, granted_at, granted_by)` accepts `admin` only and has RLS enabled;
- authenticated users can read only their own effective capabilities;
- authenticated users cannot grant/revoke roles;
- `private.is_admin()` returns true only for active admin rows;
- `set_preferred_mode('worker'|'employer')` updates only the caller;
- invalid workspace modes fail with a stable SQLSTATE/message;
- `get_my_capabilities()` returns preferred mode and admin boolean;
- anonymous callers fail;
- `admin_actions` cannot be written directly by clients.

**Step 2: Verify RED**

Run:

```powershell
npm run db:reset
npx supabase test db --local supabase/tests/130_admin_roles_and_settings.test.sql
```

Expected: FAIL because tables/functions are absent.

**Step 3: Implement the additive migration**

Required database objects:

```sql
public.account_roles
public.admin_actions
private.is_admin()
public.get_my_capabilities()
public.set_preferred_mode(text)
```

Use `security definer`, `set search_path = ''`, explicit revokes/grants, caller validation, bounded data, and indexes on role/admin audit lookups. No client-executable grant-admin RPC is allowed.

**Step 4: Extend signup/profile provisioning safely**

Read `raw_user_meta_data.preferred_mode` only through an allowlisted `worker|employer` expression in profile provisioning; otherwise default to `worker`. Extend onboarding completion to accept/persist the selected initial mode without allowing `admin`.

**Step 5: Verify GREEN**

Run:

```powershell
npm run db:reset
npm run db:test
npm run db:lint
npm run db:types
npm run db:types:check
```

Expected: all database tests pass, lint has no warnings, generated types are current.

**Step 6: Commit**

```powershell
git add supabase package.json src/types/database.generated.ts docs/DATABASE_SCHEMA.md docs/SECURITY_AND_RLS.md
git commit -m "feat(db): add workspace and admin capability boundaries"
```

### Task 4: Add report submission and admin moderation RPCs (M18 backend)

**Files:**
- Create: `supabase/migrations/20261026000200_reporting_and_moderation.sql`
- Create: `supabase/tests/140_reporting_and_moderation.test.sql`
- Modify: `package.json`
- Regenerate: `src/types/database.generated.ts`
- Modify: `docs/DATABASE_SCHEMA.md`
- Modify: `docs/SECURITY_AND_RLS.md`

**Step 1: Write failing pgTAP contracts**

Cover:

- `submit_report` validates authenticated caller, one valid subject, category/details, accessible target, and idempotency key;
- reporter can list their own submitted reports but not another user’s;
- non-admin cannot list the moderation queue, read arbitrary report detail, change status, or read admin history;
- admin can get bounded overview counts and a paginated report queue;
- admin can mark `reviewing`, `resolved`, or `dismissed` with required bounded note for terminal decisions;
- repeated decision request is idempotent;
- every moderation decision writes an immutable `admin_actions` record;
- direct report/admin audit mutation remains denied.

**Step 2: Verify RED**

Run the new pgTAP file and confirm missing-function failures.

**Step 3: Implement RPCs**

Required contracts:

```text
submit_report(..., p_client_request_id)
list_my_reports(p_limit, p_offset)
get_admin_overview()
list_admin_reports(p_status, p_limit, p_offset)
get_admin_report(p_report_id)
decide_admin_report(p_report_id, p_decision, p_note, p_client_request_id)
list_admin_actions(p_limit, p_offset)
```

All admin functions call `private.is_admin()`. Lock the report row before transition. Keep list limits between 1 and 100. Return typed rows rather than exposing unrestricted tables.

**Step 4: Verify GREEN and regenerate types**

Run reset, full pgTAP, database lint, type generation/check.

**Step 5: Commit**

```powershell
git add supabase package.json src/types/database.generated.ts docs/DATABASE_SCHEMA.md docs/SECURITY_AND_RLS.md
git commit -m "feat(admin): add reporting and audited moderation RPCs"
```

### Task 5: Extend auth contracts for signup workspace and capabilities (M16/M17)

**Files:**
- Modify: `src/features/auth/model/auth-schemas.ts`
- Modify: `src/features/auth/model/auth-state.ts`
- Modify: `src/features/auth/data/auth-gateway.ts`
- Modify: `src/features/auth/data/profile-gateway.ts`
- Modify: `src/features/auth/context/useAuth.ts`
- Modify: `src/features/auth/context/AuthProvider.tsx`
- Modify: `src/features/profile/model/profile-schemas.ts`
- Test: corresponding `__tests__` files under `src/features/auth/**` and `src/features/profile/**`

**Step 1: Write failing tests**

Assert:

- signup accepts only `worker|employer` and sends `preferred_mode` in safe user metadata;
- parsed profile includes `preferredMode` and `isAdmin` from authoritative RPC data;
- onboarding persists the chosen initial mode;
- stale capability/profile responses cannot overwrite a newer signed-in user;
- `admin` is rejected as a signup workspace.

**Step 2: Verify RED**

Run the targeted gateway/provider/schema tests. Expected: type/test failure because the new arguments and fields do not exist.

**Step 3: Implement minimal contracts**

Use the existing `ShellModeSchema` or move the shared enum to a dependency-neutral model module. Do not duplicate a disconnected role enum in tests. Extend profile/capability retrieval through the new RPC instead of a client email comparison.

**Step 4: Verify GREEN**

Run targeted tests, lint, and typecheck.

**Step 5: Commit**

```powershell
git add src/features/auth src/features/profile src/features/shell/model
git commit -m "feat(auth): load workspace and admin capabilities"
```

### Task 6: Build real Google and email authentication entry (M16)

**Files:**
- Modify: `app/(public)/sign-in.tsx`
- Create: `src/features/auth/components/EmailAuthPanel.tsx`
- Modify: `src/features/auth/components/GoogleSignInScreen.tsx`
- Test: `src/features/auth/components/__tests__/EmailAuthPanel.test.tsx`
- Modify: existing Google screen tests

**Step 1: Write failing component tests**

Cover sign-in/sign-up tabs, email/password/display-name validation, initial worker/employer selection on signup, pending lock, safe errors, confirmation guidance, and Google sign-in remaining primary.

**Step 2: Verify RED**

Run the new component test. Expected: FAIL because `EmailAuthPanel` is absent.

**Step 3: Implement the screen**

Use current schemas and context methods. The account choice text must say “Start by finding work” and “Start by offering work,” with a note that it can be changed later. Do not display Admin as a signup choice.

**Step 4: Verify GREEN**

Run targeted auth tests, lint, typecheck, and route tests.

**Step 5: Commit**

```powershell
git add app/(public) src/features/auth
git commit -m "feat(auth): add account signup and password sign-in"
```

### Task 7: Add Settings and authoritative workspace switching (M17 frontend)

**Files:**
- Create: `app/(protected)/settings.tsx`
- Create: `src/features/settings/model/settings-schemas.ts`
- Create: `src/features/settings/data/settings-gateway.ts`
- Create: `src/features/settings/screens/SettingsScreen.tsx`
- Create: tests under `src/features/settings/**/__tests__`
- Modify: `src/features/shell/context/ShellModeProvider.tsx`
- Modify: `src/features/shell/components/MarketplaceShell.tsx`
- Modify: `src/features/shell/components/AuthenticatedProfileScreen.tsx`
- Modify: protected route tests

**Step 1: Write failing gateway/provider tests**

Assert server preference is authoritative after sign-in, local persistence is a fallback, switching calls `set_preferred_mode`, server failure preserves the prior selection, and account changes never share a preference.

**Step 2: Verify RED**

Run targeted settings and shell tests. Expected: missing gateway/route failures.

**Step 3: Implement Settings**

Sections:

- profile summary;
- default workspace radio controls;
- notification permission/status and link to system settings where supported;
- privacy/location explanation;
- admin capability badge and Admin Console link only when authoritative capability is true;
- sign out.

Move the primary mode control into Settings while retaining a compact workspace switcher in the shell if useful. Never imply switching grants permissions.

**Step 4: Verify GREEN**

Run settings/shell/route tests, lint, and typecheck.

**Step 5: Commit**

```powershell
git add app/(protected) src/features/settings src/features/shell
git commit -m "feat(settings): add authoritative account preferences"
```

### Task 8: Add reporting domain and submission UI (M18 frontend)

**Files:**
- Create: `app/(protected)/reports/new.tsx`
- Create: `app/(protected)/reports/index.tsx`
- Create: `src/features/reports/model/report-schemas.ts`
- Create: `src/features/reports/data/report-gateway.ts`
- Create: `src/features/reports/screens/CreateReportScreen.tsx`
- Create: `src/features/reports/screens/MyReportsScreen.tsx`
- Create: corresponding Jest tests
- Modify: relevant gig/assignment/profile detail screens to add contextual Report actions

**Step 1: Write failing schema/gateway/component tests**

Validate target identifiers and allowlisted categories, require 20-2000 trimmed characters, generate UUID idempotency keys with `expo-crypto`, prevent duplicate submit taps, render submission success, and show real list loading/empty/error/retry states.

**Step 2: Verify RED**

Run targeted report tests. Expected: missing modules.

**Step 3: Implement the narrow report flow**

Route params are untrusted: validate them before RPC use. Never allow a report with no subject. Do not expose moderation fields in the create form.

**Step 4: Verify GREEN**

Run targeted tests, lint, and typecheck.

**Step 5: Commit**

```powershell
git add app/(protected)/reports src/features/reports src/features/*/screens
git commit -m "feat(reports): add user reporting workflow"
```

### Task 9: Add guarded Admin Console (M18 frontend)

**Files:**
- Create: `app/(protected)/admin/_layout.tsx`
- Create: `app/(protected)/admin/index.tsx`
- Create: `app/(protected)/admin/reports/[reportId].tsx`
- Create: `app/(protected)/admin/history.tsx`
- Create: `src/features/admin/model/admin-schemas.ts`
- Create: `src/features/admin/data/admin-gateway.ts`
- Create: `src/features/admin/screens/AdminOverviewScreen.tsx`
- Create: `src/features/admin/screens/AdminReportDetailScreen.tsx`
- Create: `src/features/admin/screens/AdminHistoryScreen.tsx`
- Create: corresponding Jest tests
- Modify: protected route guard tests

**Step 1: Write failing contract and route tests**

Cover runtime parsing, paginated queue, non-admin guard/redirect, admin-only navigation, loading/empty/error/retry, required decision note, double-submit prevention, and refresh after decision.

**Step 2: Verify RED**

Run targeted tests. Expected: missing admin feature and routes.

**Step 3: Implement the console**

Use the existing noticeboard tokens. Overview displays real counts. Reports show subject/category/status/time. Detail supports `Start review`, `Resolve`, and `Dismiss` only when legal. History is read-only. Every gateway call still relies on server authorization even when UI guard passes.

**Step 4: Verify GREEN**

Run targeted tests, route tests, lint, and typecheck.

**Step 5: Commit**

```powershell
git add app/(protected)/admin src/features/admin src/features/settings
git commit -m "feat(admin): add guarded moderation console"
```

### Task 10: Correct production copy, identity fallbacks, and error/empty behavior (M19)

**Files:**
- Modify: `src/features/shell/components/MarketplaceShell.tsx`
- Modify: `src/features/shell/components/AuthenticatedHomeScreen.tsx`
- Modify: `src/features/shell/components/AuthenticatedActivityScreen.tsx`
- Modify: `src/features/shell/components/ProtectedRouteUnavailableScreen.tsx`
- Modify: `app/(protected)/worker.tsx`
- Modify: `app/(protected)/employer.tsx`
- Modify: `app/(protected)/profile.tsx`
- Modify: `src/features/gigs/screens/EmployerGigDetailScreen.tsx`
- Modify: `src/features/ai-brief/components/AiJobBriefModal.tsx`
- Modify/Create: affected tests and `tests/security/truth-in-advertising.test.ts`
- Modify: `src/features/setup/setupTheme.ts`

**Step 1: Write failing behavior/copy tests**

Assert:

- gateway failures render errors with retry rather than empty lists;
- missing authoritative profile renders a recovery boundary, never `Neighbor`/`user`;
- stale/offline state is not labelled `LIVE`;
- no production copy contains `not arrived yet`, internal RLS explanation, cost commentary, or demo/preview wording;
- deterministic output is labelled `Brief Builder`/`Structured template`, not AI;
- all colors used by touched screens come from tokens.

**Step 2: Verify RED**

Run the affected component and truth tests and observe current failures.

**Step 3: Implement the presentation pass**

Keep honest product boundaries (payment outside DO-WELL, local notifications, offline stale data). Replace engineering explanations with user-centered text, not false claims.

**Step 4: Verify GREEN**

Run all affected tests, lint, typecheck, and full Jest.

**Step 5: Commit**

```powershell
git add app src tests/security
git commit -m "fix(ui): make production states presentation ready"
```

### Task 11: Prove the complete workflow through real local Auth/PostgREST/Storage (M20)

**Files:**
- Create: `tests/integration/production-workflow-http.test.ts`
- Modify: `jest.integration.config.js`
- Modify: `scripts/local-supabase-env.cjs` if additional non-secret local endpoints are needed
- Modify: `package.json`

**Step 1: Write the integration journey**

Create two local Auth users through the local admin endpoint, onboard each, then perform the production RPC lifecycle over HTTP:

```text
employer creates/publishes gig
worker discovers/applies
employer selects
worker confirms
employer creates milestone
worker starts milestone
worker uploads private evidence and finalizes submission
employer requests revision or approves
worker submits report
admin principal reads/decides report
non-admin admin call fails
```

Use generated unique emails/UUIDs and cleanup. Never log passwords/tokens.

**Step 2: Verify RED**

Run the new integration test against a reset local stack. Expected: fail at the first missing/new contract until prior tasks are integrated.

**Step 3: Complete test helpers without bypassing production contracts**

Only account creation/cleanup may use the local service role. Marketplace/reporting operations must use each user JWT and public endpoints.

**Step 4: Verify GREEN**

Run:

```powershell
npm run db:reset
npm run test:auth:integration
```

Expected: the existing auth tests and complete production workflow pass.

**Step 5: Commit**

```powershell
git add tests/integration scripts package.json jest.integration.config.js
git commit -m "test(e2e): prove real multi-account workflow"
```

### Task 12: Add idempotent operator demo provisioning (M20)

**Files:**
- Create: `scripts/provision-demo-environment.mjs`
- Create: `scripts/__tests__/provision-demo-environment.test.js`
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `docs/HOSTED_DEMO_SETUP.md`

**Step 1: Write failing script tests**

Test exported pure planning/validation helpers:

- required env presence without revealing values;
- allowed hosted project ref confirmation;
- deterministic demo record keys;
- repeated run produces reconcile/update actions rather than duplicates;
- credentials output path must resolve inside ignored `.codex-artifacts/`;
- refusal when runtime/project confirmation is absent.

**Step 2: Verify RED**

Run the script test. Expected: missing module.

**Step 3: Implement provisioning**

The operator script must:

- require an explicit project-ref confirmation;
- use privileged credentials only in the operator process;
- find the designated owner by configured email, then grant `admin` by UUID;
- provision or reconcile one separate confirmed non-admin email/password demo account;
- generate a high-entropy password and write it only to `.codex-artifacts/demo-accounts.json` with restrictive local permissions where supported;
- create a compact scenario through authenticated production RPCs where possible;
- print only safe counts/IDs truncated for diagnostics, never secrets/tokens/passwords;
- support `--dry-run` and `--apply`;
- remain idempotent.

Do not commit any email, password, token, service key, database password, or Auth UUID.

**Step 4: Verify locally**

Run unit tests and a local dry-run. Confirm `git check-ignore -v .codex-artifacts/demo-accounts.json` succeeds.

**Step 5: Commit**

```powershell
git add scripts package.json .gitignore docs/HOSTED_DEMO_SETUP.md
git commit -m "chore(demo): add safe hosted scenario provisioning"
```

### Task 13: Apply reviewed migrations and provision the authorized hosted environment (M16/M20 operations)

**Files:**
- No tracked source change during the apply itself
- Store backups/logs only under ignored `.codex-artifacts/`
- Update after verification: `docs/HOSTED_DEMO_SETUP.md`, `docs/SESSION_HANDOFF.md`, `HANDOVER.MD`

**Step 1: Confirm preconditions**

Require:

- clean reviewed migration diff;
- full local reset/pgTAP/lint/type checks green;
- independent backend/security review;
- correct linked project ref;
- no open destructive statement;
- owner approval (already granted for this productization program, but stop if target identity/project differs).

**Step 2: Create a timestamped backup**

Load ignored env values without echoing them. Dump hosted schema and approved data to `.codex-artifacts/hosted-backup-<timestamp>/`. Verify files exist and are non-empty.

**Step 3: Dry-run migration push**

Run `supabase db push --linked --dry-run` with the password supplied from the process environment. Record only migration names and exit status.

Expected: reviewed local migrations only.

**Step 4: Apply migrations**

Run the linked push once. Do not include seed data. Immediately run `supabase migration list --linked` and verify exact parity.

**Step 5: Run hosted smoke checks**

Using public/real user clients where possible, verify Google user profile, capability read, non-admin denial, admin owner grant, report flow, and core RPC availability. Never log tokens or personal data.

**Step 6: Provision demo data**

Run the operator script first with `--dry-run`, inspect safe action counts, then `--apply`. Confirm rerunning `--dry-run` reports no duplicate creation.

**Step 7: Document evidence**

Record timestamp, migration range, safe row counts, backup location category (not secret paths if shared), and limitations. Do not paste credentials.

### Task 14: Rewrite the demo and release documentation (M19/M20)

**Files:**
- Modify: `README.md`
- Modify: `docs/DEMO_RUNBOOK.md`
- Modify: `docs/COMPETITION_BUILD.md`
- Modify: `docs/DISASTER_RECOVERY.md`
- Modify: `docs/AUTHENTICATION.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `HANDOVER.MD`

**Step 1: Replace the synthetic-primary script**

The primary runbook must use production runtime, two authenticated principals, exact visible button labels, and real hosted state. Remove dark-theme, bid, rating, EXIF-stripping, demo-sign-in-button, and fake E2E claims.

**Step 2: Add an honest fallback section**

Keep the offline runtime as a separately built/started contingency with prominent synthetic-data disclosure.

**Step 3: Update setup and acceptance evidence**

Document Settings, account choice, Admin Console, reports, migration parity, demo provisioning, and what is still device-unverified.

**Step 4: Verify docs and secret hygiene**

Run:

```powershell
git diff --check
git grep -n -E "sbp_|sb_secret_|SUPABASE_DB_PASSWORD|GOOGLE_CLIENT_SECRET" -- ':!package-lock.json'
git status --short
```

Expected: no secret values; only allowlisted test/pattern references.

**Step 5: Commit**

```powershell
git add README.md HANDOVER.MD docs
git commit -m "docs: publish live production demo runbook"
```

### Task 15: Final verification, review, PR, and merge

**Files:**
- No feature files unless verification finds a defect; every defect gets a failing regression test first

**Step 1: Run the complete local gate**

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test:run
npm run db:reset
npm run db:test
npm run db:test:performance
npm run db:lint
npm run db:types:check
npm run test:auth:integration
npx expo-doctor
npx expo export --platform android --output-dir .codex-artifacts/productization-export
git diff --check
```

Expected: every command exits 0. Record exact suite/test counts.

**Step 2: Run security and scope review**

- inspect `git diff main...HEAD`;
- verify no privileged variable is referenced by `app/` or `src/`;
- verify non-admin negative tests;
- verify no email/UUID/password is hard-coded;
- verify Settings cannot self-grant admin;
- verify hosted apply/provisioning logs contain no secrets;
- verify payment, remote push, unattended sync, identity verification, and live inference are not falsely claimed.

**Step 3: Run Android acceptance**

On emulator, then physical device when available:

- Google sign-in/callback;
- email counterpart sign-in;
- onboarding account choice;
- restart restoration;
- workspace switch in Settings;
- owner Admin Console access and counterpart denial;
- marketplace flow across two sessions;
- evidence upload/review;
- report submission/moderation;
- offline/stale/recovery behavior;
- sign-out/cache isolation.

Do not mark device acceptance complete for checks that were not physically performed.

**Step 4: Independent reviews**

Request backend/security, frontend/accessibility, and final read-only diff reviews. Resolve every blocker with a regression test.

**Step 5: Push and open PR**

Use a cohesive productization PR with migration plan, hosted apply evidence, test counts, screenshots with PII redacted, cost/security review, and rollback plan. Wait for green CI.

**Step 6: Merge only after owner approval**

The owner has approved implementation and requested merge in prior project workflow, but confirm no new blocker or materially expanded scope appeared. Merge through GitHub without force-push, update local `main`, and verify remote head.

## Rollback strategy

- Disable Admin Console navigation with a safe feature flag if UI acceptance fails; server RLS/RPC controls remain authoritative.
- Revoke the owner’s `account_roles` row through operator tooling if admin access must be withdrawn; keep audit history.
- Do not down-migrate hosted tables. Correct defects with a forward migration.
- Demo accounts/data are tagged by deterministic operator metadata/keys and removed only through an explicit, reviewed cleanup mode.
- If hosted auth or network fails during presentation, use the separately disclosed offline runtime; do not relabel it as live.
- Revert application release to the previous APK if needed while leaving additive database objects dormant.

## Completion definition

M15-M20 are complete only when:

- repository documentation and CI reflect current behavior;
- hosted migrations match reviewed local migrations;
- owner capability is server-authoritative and non-admin denial is proven;
- signup/onboarding captures initial worker/employer workspace without offering admin;
- Settings persists authoritative workspace preference;
- reporting and admin moderation execute real audited RPCs;
- two distinct real principals complete the hosted marketplace story;
- production copy contains no placeholder/milestone language or false technical claims;
- Android production runtime is accepted on available target devices;
- credentials remain ignored/untracked; and
- `HANDOVER.MD` names exact remaining work if any acceptance item is unavailable.

