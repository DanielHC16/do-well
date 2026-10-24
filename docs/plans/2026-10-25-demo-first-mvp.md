# Demo-First MVP Implementation Plan

> **For Claude:** Use the `executing-plans` skill to implement this plan task-by-task.

**Goal:** Deliver a reliable, zero-cost Android emulator demo of the complete core gig lifecycle without depending on external authentication or networking.

**Architecture:** An explicit build-time runtime switch chooses either the existing production Auth/Supabase tree or an isolated local demo tree. Demo state is a validated, versioned AsyncStorage document manipulated by pure domain transitions and presented through thin Expo Router screens; production remains the default and its auth/security boundaries are unchanged.

**Tech Stack:** Expo SDK 58, React Native 0.88, Expo Router, strict TypeScript, React Context/useReducer, AsyncStorage, Zod, Jest 30, React Native Testing Library.

---

## Success criteria

On an Android emulator, starting with `EXPO_PUBLIC_APP_RUNTIME=demo` and no working OAuth session, a presenter can reset the demo and perform this story in five minutes:

1. Enter as the seeded employer and create/publish a valid gig.
2. Switch to the seeded worker, discover that gig, inspect it, and apply once.
3. Switch to employer, review the application, and select the worker.
4. Switch to worker, open the assignment, and submit a text work note.
5. Switch to employer, approve the submission, and see the completed state/activity timeline.
6. Restart the app and see the completed state persist; reset returns to deterministic seed state.

Every screen must say `DEMO MODE - LOCAL DATA`. No network, credentials, Docker, hosted service, billing, AI, or physical phone is required. The normal unset runtime still enters the existing production auth flow.

## Scope constraints

- Do not modify Supabase migrations, RLS, production auth gateways, or production session semantics.
- Do not create fake JWTs, Supabase sessions, emails, or passwords.
- Do not call the local reducer/repository secure, authenticated, synchronized, or production-ready.
- Use synthetic names/content only. Never copy local credentials or personal data into fixtures, logs, screenshots, tests, issues, or commits.
- Demo supports one local employer, one local worker, one selected worker per gig, text-only submission, and approval. Cancellation, disputes, revision loops, files, maps, AI, notifications, and multi-device behavior stay out.

### Task 1: Approve and expose the explicit runtime boundary

**Files:**
- Modify: `docs/adr/0006-explicit-local-demo-runtime.md`
- Modify: `docs/adr/README.md`
- Modify: `docs/DECISIONS.md`
- Create: `src/shared/config/app-runtime.ts`
- Create: `src/shared/config/__tests__/app-runtime.test.ts`
- Modify: `.env.example`

**Steps:**

1. Change ADR 0006 to `Accepted` only after the project owner accepts this plan; add it to the ADR index and decision register.
2. Write failing tests proving `undefined` and `production` select production, `demo` selects demo, and any other value throws `Public application runtime is invalid`.
3. Run `npm run test:run -- app-runtime` and confirm the module is missing/failing.
4. Implement a strict Zod enum parser for `EXPO_PUBLIC_APP_RUNTIME`; do not reuse `readPublicEnv`, because demo must boot without Supabase configuration.
5. Add `EXPO_PUBLIC_APP_RUNTIME=production` with explanatory safe-public comments to `.env.example`.
6. Run the focused test, `npm run typecheck`, and `npm run lint`; expect all to pass.
7. Commit: `feat(demo): add explicit local runtime boundary`.

### Task 2: Define the smallest real demo domain

**Files:**
- Create: `src/features/demo/model/demo-schema.ts`
- Create: `src/features/demo/model/demo-state.ts`
- Create: `src/features/demo/model/demo-reducer.ts`
- Create: `src/features/demo/model/__tests__/demo-reducer.test.ts`

**Model:**

- `DemoPersona`: fixed `employer` or `worker`, with synthetic id and display name.
- `DemoGig`: id, employerId, title, description, category, workMode (`onsite | remote`), publicArea, budgetAmount, status (`published | assigned | completed`), createdAt.
- `DemoApplication`: id, gigId, workerId, message, status (`pending | accepted`), createdAt.
- `DemoAssignment`: id, gigId, employerId, workerId, status (`active | submitted | completed`), submissionNote, submittedAt, completedAt.
- `DemoActivity`: id, gigId, assignmentId nullable, actor, type, summary, occurredAt.
- `DemoState`: schemaVersion `1`, activePersona, gigs, applications, assignments, activity.

**Steps:**

1. Write reducer tests for create/publish, one application per worker/gig, one assignment per gig, only the selected worker submitting, only the owning employer approving, ordered activity, and rejection of every invalid transition.
2. Use deterministic ids/timestamps injected into action payloads; never call random/time APIs inside the reducer.
3. Run `npm run test:run -- demo-reducer`; expect failure because implementation is absent.
4. Implement Zod schemas and a discriminated action union. Invalid state/action inputs return typed domain errors; they do not partially mutate state.
5. Implement immutable transitions with the minimum fields above. Selection atomically accepts the application, assigns the gig, creates the assignment, and appends activity in one reducer action.
6. Run focused tests, typecheck, and lint; expect pass.
7. Commit: `feat(demo): model local gig lifecycle`.

### Task 3: Add deterministic seed, persistence, and reset

**Files:**
- Create: `src/features/demo/data/demo-seed.ts`
- Create: `src/features/demo/data/demo-repository.ts`
- Create: `src/features/demo/data/__tests__/demo-repository.test.ts`

**Steps:**

1. Write failing repository tests for missing-state seed, valid-state load, malformed-state recovery with a non-sensitive error, serialized writes, and reset of exactly `do-well.demo.state.v1`.
2. Seed two synthetic personas and two published sample gigs patterned after the existing local fixtures in `supabase/seed.sql:83-125`; do not import or mutate database fixtures.
3. Run `npm run test:run -- demo-repository`; expect failure.
4. Implement `load`, `save`, and `reset` against injected AsyncStorage-compatible storage. Parse every read with `DemoStateSchema`; on corruption preserve no partial data and replace it with the deterministic seed.
5. Serialize saves through one promise chain so rapid taps cannot reorder stored snapshots.
6. Run focused tests, typecheck, and lint; expect pass.
7. Commit: `feat(demo): persist deterministic local scenario`.

### Task 4: Compose production and demo providers without weakening auth

**Files:**
- Create: `src/features/demo/context/DemoProvider.tsx`
- Create: `src/features/demo/context/useDemo.ts`
- Create: `src/features/demo/context/__tests__/DemoProvider.test.tsx`
- Create: `src/shared/runtime/RootRuntime.tsx`
- Create: `src/shared/runtime/__tests__/RootRuntime.test.tsx`
- Modify: `app/_layout.tsx:3-9`
- Modify: `app/index.tsx:6-23`

**Steps:**

1. Write failing tests proving demo runtime renders without constructing production auth dependencies, production runtime still renders `AuthProvider`, and the index redirects demo to `/(demo)` while production retains all current auth redirects.
2. Run `npm run test:run -- RootRuntime DemoProvider`; expect failure.
3. Implement `DemoProvider`: load before rendering routes, expose state/actions/error/reset, persist after successful actions, prevent duplicate taps while an action is being saved, and show retry/reset on a storage error.
4. Implement `RootRuntime` as the only mode branch. It reads the validated runtime once and wraps children in exactly one provider. Do not add demo behavior to `AuthProvider`.
5. Update the root layout and index route to delegate runtime selection. Avoid importing/reading public Supabase configuration on the demo execution path.
6. Run the focused tests plus all existing auth route/provider tests; expect pass without snapshot/behavior changes in production cases.
7. Commit: `feat(demo): isolate demo and production runtimes`.

### Task 5: Build the reusable demo shell and persona switch

**Files:**
- Create: `app/(demo)/_layout.tsx`
- Create: `app/(demo)/index.tsx`
- Create: `src/features/demo/components/DemoBanner.tsx`
- Create: `src/features/demo/components/DemoShell.tsx`
- Create: `src/features/demo/screens/DemoHomeScreen.tsx`
- Create: `src/features/demo/screens/__tests__/DemoHomeScreen.test.tsx`
- Extend or replace: `src/features/setup/setupTheme.ts`

**Steps:**

1. Write component tests proving the disclosure banner is always visible, both personas are keyboard/screen-reader operable, the active role is announced, loading/error/empty states exist, and reset requires confirmation.
2. Run `npm run test:run -- DemoHomeScreen`; expect failure.
3. Build a temporary but coherent mobile shell using centralized tokens. Home shows role-specific next actions, progress (`1. Post`, `2. Apply`, `3. Select`, `4. Submit`, `5. Approve`), and recent activity.
4. Provide a local persona switcher labeled `Present as Employer` / `Present as Worker`; never label it sign-in.
5. Add a disclosure sheet: local synthetic data, no authentication/cloud sync/payments/identity verification.
6. Run focused tests, typecheck, lint, and `npm run format:check`; expect pass.
7. Commit: `feat(demo): add disclosed persona-based demo shell`.

### Task 6: Implement employer gig creation

**Files:**
- Create: `app/(demo)/employer/gigs/new.tsx`
- Create: `src/features/demo/screens/CreateDemoGigScreen.tsx`
- Create: `src/features/demo/screens/__tests__/CreateDemoGigScreen.test.tsx`

**Steps:**

1. Write failing tests for required title/description/category/work mode/budget, onsite public area, successful create-and-publish, duplicate-tap suppression, and worker-role rejection.
2. Run `npm run test:run -- CreateDemoGigScreen`; expect failure.
3. Implement the accessible form with inline validation, pending state, stable errors, and successful redirect to the created gig.
4. Use the demo domain action only; no Supabase import is permitted below `src/features/demo/**` or `app/(demo)/**`.
5. Run focused tests, typecheck, and lint; expect pass.
6. Commit: `feat(demo): create and publish local gigs`.

### Task 7: Implement worker discovery and application

**Files:**
- Create: `app/(demo)/gigs/[gigId].tsx`
- Create: `src/features/demo/screens/DemoGigDetailScreen.tsx`
- Create: `src/features/demo/screens/__tests__/DemoGigDetailScreen.test.tsx`

**Steps:**

1. Write failing tests for published-gig list/detail, local/remote labels, PHP budget, recommendation explanation, application validation, duplicate application rejection, and employer-role rejection.
2. Run `npm run test:run -- DemoGigDetailScreen`; expect failure.
3. Render published gigs on worker home and a detail screen with a bounded application message form.
4. On apply, dispatch once, show `Application sent`, append activity, and return a disabled/already-applied state.
5. Run focused tests, typecheck, and lint; expect pass.
6. Commit: `feat(demo): discover gigs and apply locally`.

### Task 8: Implement selection, submission, and approval

**Files:**
- Create: `app/(demo)/employer/gigs/[gigId].tsx`
- Create: `app/(demo)/assignments/[assignmentId].tsx`
- Create: `src/features/demo/screens/ManageDemoGigScreen.tsx`
- Create: `src/features/demo/screens/DemoAssignmentScreen.tsx`
- Create: `src/features/demo/screens/__tests__/ManageDemoGigScreen.test.tsx`
- Create: `src/features/demo/screens/__tests__/DemoAssignmentScreen.test.tsx`

**Steps:**

1. Write failing tests for applicant privacy by active persona, atomic single selection, active assignment visibility to both participants, worker-only bounded text submission, employer-only approval, completed state, and ordered activity.
2. Run `npm run test:run -- ManageDemoGigScreen DemoAssignmentScreen`; expect failure.
3. Implement employer applicant review and one-tap selection with pending/disabled states.
4. Implement the shared assignment detail with role-specific actions: worker submits a note; employer approves after submission.
5. After approval, show a completion summary and timeline. Do not imply money transfer, rating, or identity verification.
6. Run focused tests, typecheck, and lint; expect pass.
7. Commit: `feat(demo): complete the local work lifecycle`.

### Task 9: Add one automated demo journey and operating instructions

**Files:**
- Create: `tests/demo/demo-lifecycle.integration.test.tsx`
- Modify: `README.md`
- Modify: `docs/IMPLEMENTATION_ROADMAP.md`
- Modify: `docs/SESSION_HANDOFF.md`
- Modify: `.github/pull_request_template.md` only if it lacks a demo truth-in-advertising check

**Steps:**

1. Write one integration test that drives create -> persona switch -> apply -> switch -> select -> switch -> submit -> switch -> approve -> remount -> persisted completion -> reset.
2. Run the test and fix only defects exposed by this journey.
3. Add emulator commands to README:

   ```powershell
   nvm use 22.23.2
   $env:EXPO_PUBLIC_APP_RUNTIME="demo"
   npm run android -- --device emulator-5554
   ```

   Also document removing/unsetting the variable before production-auth testing.
4. Revise the roadmap by inserting an expedited `MD1 - Local competition demo slice` before M04-M09 implementation, and state explicitly that it does not complete or replace M03-M09 production acceptance. Mark M03 production acceptance deferred, not completed.
5. Update the handoff with exact verified commands, emulator model/API, known exclusions, branch/PR, and next production task.
6. Commit: `test(demo): cover the complete local MVP journey` and `docs(demo): add emulator runbook and roadmap pivot`.

### Task 10: Verify, review, package, and merge the demo milestone

**Files:**
- No expected source changes; fixes receive focused tests and separate commits.

**Steps:**

1. Run `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run test:run`; all must pass.
2. Run existing production auth integration and local database checks to prove the demo work did not weaken them: `npm run test:auth:integration`, `npm run db:test`, `npm run db:lint`, and `npm run db:types:check`.
3. Run `npx expo-doctor`; expect all checks to pass.
4. Build/install on the emulator in demo mode. Turn off host networking after Metro has bundled, cold restart the app, execute the five-minute lifecycle, restart again, and reset. Record only synthetic data.
5. Start once with the runtime unset and confirm the existing production auth boundary still appears. Invalid runtime must show a configuration failure, never demo.
6. Review the staged file list and scan for secrets/PII. Confirm `.env.local`, OAuth JSON, `.codex-artifacts`, native output, screenshots with account details, and demo state exports are not staged.
7. Request independent frontend/accessibility review and security review focused on runtime isolation/truthful claims. Resolve all blocking/high findings.
8. Update the PR with exact evidence, zero-cost impact, explicit limitations, and rollback. Mark ready and merge only after green CI and project-owner approval.

## Acceptance criteria

- The success-criteria journey works repeatedly on the named Android emulator with no network or account.
- Data persists over app restart and resets deterministically.
- Invalid actions and duplicate taps never create duplicate applications/assignments/submissions.
- Production is the default; demo mode cannot be selected through UI, deep link, or remote input.
- Production Auth/Supabase tests remain green and no production security control is removed or bypassed.
- Every demo route visibly discloses local synthetic data and the README/PR state what is not demonstrated.
- No secret, personal identifier, external paid service, or billing setup is introduced.

## Risks and rollback

- **Accidental demo artifact release:** production-default parser, invalid-value failure, visible banner, release checklist. Roll back by unsetting the flag or removing the demo route/provider.
- **Misrepresentation:** disclosure on every screen and in the demo script; never call local personas authenticated users or claim RLS/cloud proof.
- **State corruption:** schema-validate reads and reset to seed; retain no partial document.
- **Divergence from production:** keep only the six-step core lifecycle, use shared domain vocabulary, and do not copy demo persistence into production gateways.
- **Schedule expansion:** files, revision cycles, AI, maps, cancellation, disputes, notifications, and visual polish beyond accessible temporary UI are hard exclusions.

## Execution recommendation

Execute Tasks 1-4 first as the isolation/domain checkpoint, Tasks 5-8 as the demonstrable slice, then Tasks 9-10 as proof and closeout. Stop only for a failure that would weaken production runtime isolation or make the demo misleading; visual refinements and external auth remain non-blocking for this milestone.
