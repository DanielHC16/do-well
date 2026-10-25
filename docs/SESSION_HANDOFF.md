# Session Handoff

## Snapshot

- **Last verified:** 2026-10-26 (Asia/Manila)
- **Completed milestones:** M01 — Expo initialization; M02 — Supabase schema; M03A — auth foundation; D01 — Offline Demo; M04 — Marketplace shell; M05 — Gig creation; M06 — Discovery; M07 — Applications; M08 — Agreements; M09 — Submissions; M10 — AI Brief Builder; M11 — Location; M12 — Notifications/evidence; M13 — Weak-connectivity; M14 — Security & tests; M15 — CI & Productization Reset; M17 — Settings, Workspace Persistence & Admin Capability; M18 — Functional Moderation Console
- **Current milestone:** M15-M18 Productization & Admin Demo
- **Status:** `COMPLETED`
- **Branch:** `feat/productization-admin-demo`
- **Base/default branch:** `main`
- **Current implementation merge:** `4f8cbe0` (`Merge pull request #39`)
- **Remote:** `https://github.com/DanielHC16/do-well` (`PRIVATE`)
- **M01 PR:** [#17](https://github.com/DanielHC16/do-well/pull/17), squash-merged as `d073c4b`
- **M02 PR:** [#19](https://github.com/DanielHC16/do-well/pull/19), merge commit `f7a3317`
- **M03A PR:** [#22](https://github.com/DanielHC16/do-well/pull/22), merged as `368613a`
- **D01 PR:** [#24](https://github.com/DanielHC16/do-well/pull/24), merged as `d7092c3`
- **M04 PR:** [#26](https://github.com/DanielHC16/do-well/pull/26), merged as `b75a13e`
- **M05 PR:** [#27](https://github.com/DanielHC16/do-well/pull/27), merged as `464d06b`
- **M06 PR:** [#28](https://github.com/DanielHC16/do-well/pull/28), merged as `a0cd300`
- **M07 PR:** [#29](https://github.com/DanielHC16/do-well/pull/29), merged as `5d0dac5`
- **M08 PR:** [#30](https://github.com/DanielHC16/do-well/pull/30), merged as `9e177e1`
- **M09 PR:** [#31](https://github.com/DanielHC16/do-well/pull/31), merged as `70c6032`
- **M10 PR:** [#32](https://github.com/DanielHC16/do-well/pull/32), merged as `29b9924`
- **M11 PR:** [#33](https://github.com/DanielHC16/do-well/pull/33), merged as `58cf36a`
- **M12 PR:** [#34](https://github.com/DanielHC16/do-well/pull/34), merged as `04cf199`; corrective hardening merged via [#35](https://github.com/DanielHC16/do-well/pull/35) as `ae953f3`
- **M13 PR:** [#36](https://github.com/DanielHC16/do-well/pull/36), merged as `e0d3a5d`
- **M14 PR:** [#37](https://github.com/DanielHC16/do-well/pull/37), merged as `efe12fd`
- **Audit PR:** [#38](https://github.com/DanielHC16/do-well/pull/38), merged as `5839b68`
- **Docs PR:** [#39](https://github.com/DanielHC16/do-well/pull/39), merged as `4f8cbe0`

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
- Latest verification: formatting, lint, strict typecheck, 23 Jest suites / 122 tests, local Auth/JWT integration, 6 pgTAP files / 69 database tests, database lint/type drift, and all 20 Expo Doctor checks pass.

## M04 completed state

- M04 merged into `main` via PR #26 (`b75a13e`).
- Shell mode schema, AsyncStorage per-user mode persistence, context provider, and retry boundaries implemented in `src/features/shell/`.
- Noticeboard marketplace shell with top bar brand strip, dual-mode switcher (`worker` vs `employer`), and bottom navigation tab list (`Home`, `Activity`, `Profile`).
- Protected routes created under `app/(protected)/`: `_layout.tsx`, `index.tsx`, `worker.tsx`, `employer.tsx`, `activity.tsx`, `profile.tsx`, and `[...unmatched].tsx`.
- Verification passed: 37 Jest test suites / 182 tests passing, clean TypeScript strict typecheck (`tsc --noEmit`), clean Prettier, clean ESLint, and 20/20 `expo-doctor` checks.

## M05 completed state

- M05 merged into `main` via PR #27 (`464d06b`), closing Issue #6.
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

## M06 completed state

- Plan document penned at `docs/plans/2026-10-25-m06-gig-discovery.md`.
- Database functions `calculate_distance_km` and `discover_gigs` added in `supabase/migrations/20261025000200_gig_discovery_rpcs.sql`.
  - Pure SQL Haversine spherical distance calculation (zero external API, PHP 0 / USD 0 budget ceiling).
  - Deterministic explainable reason generation (`Within 5 km of you`, `Within 15 km of you`, `Remote - work from anywhere`, `Recently posted`).
  - Strict privacy projection: only coarse `public_area`, `public_latitude`, `public_longitude` are returned; exact coordinates and private addresses in `gig_private_locations` remain inaccessible under server RLS.
- Database tests added in `supabase/tests/080_gig_discovery_rpcs.test.sql` (8 pgTAP files / 98 tests passing).
- Discovery schemas and gateway implemented in `src/features/discovery/model/` and `src/features/discovery/data/`.
- UI screens and routes implemented:
  - `WorkerGigDetailScreen.tsx` displaying public details, reason chips, and M07 application notice.
  - Route `app/(protected)/worker/gigs/[gigId].tsx`.
  - Noticeboard feed on `AuthenticatedHomeScreen.tsx` with mode toggles (All / Nearby / Remote), category pills horizontal scroll, cards with budget, distance, area, and explainable chips.
- Quality verification: 45 Jest suites / 224 tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M07 completed state

- Plan document penned at `docs/plans/2026-10-25-m07-worker-applications.md`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000300_application_and_selection_rpcs.sql`:
  - `apply_to_gig(p_gig_id, p_message, p_client_request_id)`: Enforces caller authentication (`42501`), profile onboarding completion (`P0002`), published status (`P0004`), self-dealing prohibition (`P0005`), deadline validation, partial unique index idempotency, single live application enforcement (`P0008`), message length checks, and audit logging into `activity_events` (`gig_application_received`).
  - `withdraw_application(p_application_id)`: Enforces ownership (`P0010`), pending status (`P0011`), transitions application to `withdrawn`, and records `gig_application_withdrawn` event.
  - `select_worker_atomic(p_application_id, p_client_request_id)`: Atomically locks gig and winning application (`SELECT ... FOR UPDATE`), validates employer ownership (`P0013`), gig published state (`P0014`), application pending state (`P0012`), accepts winner, mass-rejects competing applications for the gig, closes gig (`status = 'closed'`), instantiates assignment with proposed terms, records `gig_applicant_selected` activity event, and returns assignment with idempotency.
  - Query helper RPCs `list_gig_applicants(p_gig_id)` and `get_worker_application_for_gig(p_gig_id)` with explicit permission revocation from public/anon and execute grant strictly to `authenticated`.
- Database tests added in `supabase/tests/090_application_and_selection_rpcs.test.sql` (9 pgTAP files / 127 tests passing).
- Application schemas and gateway implemented in `src/features/applications/model/` and `src/features/applications/data/`.
- UI screens and routes integrated:
  - `WorkerGigDetailScreen.tsx`: Application submission form with character limit, submission feedback, `PENDING REVIEW` state card, note disclosure, and `Withdraw Application` flow.
  - `EmployerGigDetailScreen.tsx`: Applicants review list with applicant cards, location, applied date, message note, atomic `Select Worker` action with confirmation, and `ACTIVE ASSIGNMENT` banner displaying proposed terms.
- Quality verification: 47 Jest suites / 236 tests pass, 9 pgTAP files / 127 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.
- Merged to `main` via PR #29 (`5d0dac5`), closing Issue #8.

## M08 completed state

- Merged to `main` via PR #30 (`9e177e1`), closing Issue #9.

## M09 completed state

- Plan document authored at `docs/plans/2026-10-25-m09-work-submission.md`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000500_submission_and_approval_rpcs.sql`:
  - `submit_assignment_work(p_assignment_id, p_note, p_milestone_id, p_client_request_id)`: Worker-only submission (`P0031`), checks onboarding (`P0002`), validates active or revision-requested status (`P0032`), validates milestone ownership (`P0033`), checks note length 1..2000 (`P0039`), auto-increments version (v1, v2...), sets `status = 'submitted'`, updates assignment to `submitted`, records `work_submitted` activity event with dedupe key.
  - `request_submission_revision(p_submission_id, p_review_note)`: Employer-only revision request (`P0036`), checks review note 1..2000 chars (`P0034`), verifies submitted status (`P0037`/`P0038`), updates submission to `revision_requested`, updates assignment to `revision_requested`, and emits `revision_requested` activity event for worker.
  - `approve_assignment_completion(p_submission_id, p_review_note)`: Employer-only approval (`P0036`), verifies submitted status (`P0037`/`P0038`), updates submission to `approved`, updates assignment to `completed` with `completed_at = now()`, automatically approves unapproved assignment milestones, and emits `assignment_completed` activity event for worker.
  - `list_assignment_submissions(p_assignment_id)`: Returns ordered submissions by `version desc, created_at desc` for assignment participants.
  - `get_latest_assignment_submission(p_assignment_id)`: Returns latest submission record for assignment participants.
  - Revoked all from `public`, `anon`; granted execute strictly to `authenticated`.
- Database tests in `supabase/tests/110_submission_and_approval_rpcs.test.sql` (11 pgTAP files / 191 tests passing).
- Domain schemas and gateway implemented in `src/features/submissions/`.
- UI screens and routes integrated:
  - `WorkerAssignmentDetailScreen.tsx`: Submission note form, revision instructions banner, under-review state card, completed state banner, and submission history.
  - `EmployerAssignmentDetailScreen.tsx`: Worker submission review card, "Approve & Complete Work" action, "Request Revision" modal/form with required review note, revision pending card, and completed state banner.
  - `AuthenticatedActivityScreen.tsx`: Event formatters for `work_submitted`, `revision_requested`, and `assignment_completed`.
- Quality verification: 53 Jest suites / 279 tests pass, 11 pgTAP files / 191 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

- Plan document penned at `docs/plans/2026-10-25-m08-task-agreements.md`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000400_assignment_and_milestone_rpcs.sql`:
  - `confirm_assignment(p_assignment_id)`: Worker-only agreement acceptance (`P0020`), verifies `proposed` status (`P0021`), sets `status = 'active'`, `worker_confirmed_at = now()`, `started_at = now()`, and emits `assignment_confirmed` activity event.
  - `decline_assignment(p_assignment_id)`: Worker-only decline (`P0020`), sets `status = 'declined'`, `cancelled_at = now()`, reopens gig notice to `published`, marks application `status = 'declined'`, and emits `assignment_declined` activity event.
  - `cancel_proposed_assignment(p_assignment_id)`: Employer-only cancellation (`P0022`), sets `status = 'cancelled'`, `cancelled_at = now()`, reopens gig notice to `published`, marks application `status = 'rejected'`, and emits `assignment_cancelled` activity event.
  - `create_assignment_milestone(p_assignment_id, p_title, p_description, p_due_at)`: Employer-only milestone builder (`P0023`), checks assignment status (`P0024`), auto-increments position 1..20 (`P0027`), title bounds 2..100 (`P0025`), description max 1000 (`P0026`), inserts with `status = 'pending'`, and emits `milestone_created` for worker.
  - `start_assignment_milestone(p_milestone_id)`: Worker-only milestone start (`P0028`), checks active assignment (`P0029`), pending milestone status (`P0030`), sets `status = 'in_progress'`, and emits `milestone_started` for employer.
  - `list_assignment_milestones(p_assignment_id)`: Ordered milestone query by `position asc` for assignment participants.
  - `get_assignment_detail(p_assignment_id)`: Returns joined assignment, employer profile, worker profile, and gig summary JSON for assignment participants.
  - `list_user_activity(p_limit, p_offset)`: Returns recipient's activity event records ordered by `created_at desc`.
  - `mark_activity_read(p_event_id)`: Sets `read_at = clock_timestamp()` for owned event.
  - Revoked all from `public`, `anon`; granted execute strictly to `authenticated`.
- Database tests added in `supabase/tests/100_assignment_and_milestone_rpcs.test.sql` (10 pgTAP files / 158 tests passing).
- Domain schemas and gateway implemented in `src/features/assignments/model/` and `src/features/assignments/data/`.
- UI screens and routes integrated:
  - `WorkerAssignmentDetailScreen.tsx`: Agreement review, terms, employer profile card, confirm and decline actions, and ordered milestones view with start milestone action.
  - `EmployerAssignmentDetailScreen.tsx`: Agreement details, selected worker profile card, cancel proposal action, ordered milestone step breakdown, and milestone creation modal/card.
  - `AuthenticatedActivityScreen.tsx`: Live activity feed with read markers, relative timestamps, and navigation links to assignment agreements.
  - Routes: `app/(protected)/worker/assignments/[assignmentId].tsx` and `app/(protected)/employer/assignments/[assignmentId].tsx`.
  - Route tests in `app/(protected)/__tests__/routes.test.tsx`.
- Quality verification: 51 Jest suites / 259 tests pass, 10 pgTAP files / 158 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M11 completed state

- ADR 0007 penned at `docs/adr/0007-foreground-location-and-list-first-discovery.md` establishing one-shot foreground approximate location and list-first nearby discovery at zero external spend (PHP 0 / USD 0).
- Plan document authored at `docs/plans/2026-10-25-m11-android-location.md`.
- `expo-location` pinned to `~58.0.19` compatible with Expo SDK 58.
- Android permissions `ACCESS_COARSE_LOCATION` and `ACCESS_FINE_LOCATION` configured in `app.config.ts` with explicit user-facing purpose descriptions; background location disabled.
- Domain schemas in `src/features/location/model/location-schemas.ts`: `LocationCoordinatesSchema`, `LocationPermissionStateSchema`, `LocalityOptionSchema`, `ActiveLocationSchema`, `METRO_MANILA_LOCALITIES`, and helper functions.
- Location service adapter in `src/features/location/data/location-service.ts` with balanced accuracy, 5000ms timeout race, and defensive permission mapping (`undetermined`, `granted`, `denied`, `blocked`, `services_disabled`).
- UI components: `LocationBar.tsx` and `LocationSelectorModal.tsx` in `src/features/location/components/`.
- Noticeboard integration: `AuthenticatedHomeScreen.tsx` connects `LocationBar` and `LocationSelectorModal`, passing coordinates and radius filter directly to `discoveryGateway.discoverGigs({ workerLatitude, workerLongitude, filters })`.
- Quality verification: 63 Jest test suites / 388 tests pass, 11 pgTAP files / 191 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.
- Merged into `main` via PR #33 (`58cf36a`), closing Issue #12.

## M12 completed state

- Plan document authored at `docs/plans/2026-10-25-m12-evidence-and-notifications.md`.
- `expo-image-picker` (`~58.0.10`) and `expo-notifications` (`~58.1.6`) pinned for Expo SDK 58 New Architecture.
- Android permissions and plugins configured in `app.config.ts`: `POST_NOTIFICATIONS` permission and `expo-image-picker` with `microphonePermission: false`.
- Database functions and RPCs implemented in `supabase/migrations/20261025000600_evidence_submission_rpcs.sql`:
  - `begin_submission(p_assignment_id, p_milestone_id, p_note, p_client_request_id)`: Reserves `pending_upload` submission record with version bump, worker validation (`P0031`), active/revision status check (`P0032`), and client request deduplication.
  - `finalize_submission(p_submission_id, p_files)`: Validates private object paths `{submitted_by}/{assignment_id}/{submission_id}/{file_id}.ext`, inserts file records into `submission_files`, sets submission to `submitted`, sets assignment to `submitted`, and emits `work_submitted` into `activity_events`.
  - `list_submission_files(p_submission_id)`: Securely lists attached evidence records for assignment participants.
  - Permissions revoked from `public, anon`; granted strictly to `authenticated`.
- pgTAP database test suite `supabase/tests/120_evidence_submission_rpcs.test.sql` (12 pgTAP files / 212 tests pass).
- Evidence domain, service, and picker:
  - `src/features/submissions/model/submission-schemas.ts`: Added `SelectedEvidenceImageSchema`, `SubmissionFileRecordSchema`, `BeginSubmissionInputSchema`, `FinalizeSubmissionInputSchema`.
  - `src/features/submissions/data/submission-gateway.ts`: Added `beginSubmission`, `finalizeSubmission`, `listSubmissionFiles`, `createEvidenceSignedUrl`, `uploadEvidenceBlob`.
  - `src/features/submissions/evidence/services/evidence-image-service.ts`: Media library and camera selection with 5MB cap, JPEG/PNG/WEBP validation, `exif: false`, and `readImageBlob`.
  - `src/features/submissions/evidence/components/EvidenceAttachmentPicker.tsx`: Accessible thumbnail preview cards, file size badges, and deletion controls.
- Local notifications system:
  - `src/features/notifications/model/notification-schemas.ts`: Configured Android channels `assignment_updates`, `milestone_alerts`, `general_alerts`.
  - `src/features/notifications/services/notification-service.ts`: Channel-aware local dispatch, foreground presentation, permission checks, and allowlisted cold-start/foreground notification-response routes.
- UI Screens integrated:
  - `WorkerAssignmentDetailScreen.tsx`: Evidence attachment picker and staged `begin -> upload -> finalize` pipeline with stable per-attempt UUIDs, in-session retry reuse, and measured upload sizes.
  - `EmployerAssignmentDetailScreen.tsx`: Evidence photo thumbnails with private short-lived signed URLs; review actions fail closed while evidence is loading or cannot be verified.
  - `AuthenticatedActivityScreen.tsx`: Explicit local-alert permission control and per-account deduplicated recipient notifications derived from canonical unread activity events. Actor-side self-notifications were removed.
- Corrective migration `20261025000700_harden_evidence_finalization.sql` locks assignment version allocation and requires every manifest entry to match an existing private Storage object, MIME, size, UUID path, extension, JSON shape, and five-file server cap before state advances.
- The audit and disposition are recorded in `docs/reports/2026-10-25-m12-implementation-audit.md`.
- Quality verification: 69 Jest test suites / 438 tests pass, 12 pgTAP files / 212 database tests pass, clean `db:lint`, clean `db:types:check`, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M13 completed state

- Plan document penned at `docs/plans/2026-10-25-m13-connectivity-resilience.md`.
- Network detection and context:
  - Installed `expo-network` (`~58.0.4`).
  - `src/features/connectivity/services/connectivity-service.ts`: Testable `expo-network` wrapper with fail-open fallback and clean listener teardown.
  - `src/features/connectivity/context/ConnectivityProvider.tsx`: React context provider supplying reactive `isConnected`, `isInternetReachable`, and `connectionType`.
  - `src/features/connectivity/components/OfflineBanner.tsx`: High-contrast accessible offline warning banner mounted in `MarketplaceShell`.
  - `src/features/connectivity/components/StaleDataBadge.tsx`: Visual badge indicating snapshot timestamp on cached data.
- User-scoped bounded read cache:
  - `src/shared/persistence/cache-store.ts`: User-isolated AsyncStorage cache scoped to `@dowell/cache/{userId}/{key}` with 50-entry LRU eviction cap and 500 KB per-entry boundary.
  - Automatic cache purge on sign-out and account switch wired into `AuthProvider`.
  - Integrated offline cache fallback with `cachedAt` metadata in `discoveryGateway` and `assignmentGateway`.
- Form drafts and mutation resilience:
  - `src/features/applications/data/application-draft-store.ts`: Persistent AsyncStorage draft store for worker bids.
  - `src/features/submissions/data/submission-draft-store.ts`: Persistent AsyncStorage draft store for worker submission notes and photo references.
  - `src/shared/api/network-timeout.ts`: 12-second bounded abort timeouts and mutation reconciliation helpers.
- Quality verification: 77 Jest test suites / 468 tests pass, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## M14 completed state

- Plan document penned at `docs/plans/2026-10-25-m14-security-build.md`.
- Security verification and secret scan:
  - `tests/security/secret-exposure.test.js`: Confirms zero tracked or bundled secrets in git or client code.
  - `tests/security/authorization-boundaries.test.ts`: Validates schema rules, RPC transition guards, employer/worker role disjointness, storage boundary constraints (max 5 files, 5MB, JPEG/PNG/WEBP, private paths), and user-partitioned caching.
  - `tests/security/truth-in-advertising.test.ts`: Asserts foreground-only location permissions (background tracking strictly disabled), local-only notification scheduling, deterministic heuristic AI Brief generation disclaimer, and prominent offline demo preview disclosures.
- End-to-end competition scenario test suite:
  - `tests/e2e/competition-workflow.test.ts`: Full 5-stage lifecycle scenario verified end-to-end (Employer gig creation -> Worker application -> Selection & atomic agreement -> Work submission with evidence -> Employer approval & completion) with multi-role security negative assertions.
- Competition build & runbooks:
  - `docs/COMPETITION_BUILD.md`: Android release APK compilation commands, checksum verification, apksigner instructions, and zero-cost build profiles.
  - `docs/DEMO_RUNBOOK.md`: Authoritative 3-5 minute live judging script and feature showcase walkthrough.
  - `docs/DISASTER_RECOVERY.md`: Presentation contingency matrix, network failure pivot, and local database backup/restore procedures.
  - Static Hermes Android bundle verified: `npx expo export --platform android` generated 4.9MB bundle with 0 errors.
- Quality verification: 81 Jest test suites / 482 tests pass, clean `format:check`, clean `lint`, clean `typecheck`, and 20/20 `expo-doctor` checks.

## Open product decisions

- Set evidence and abandoned-upload retention periods before M09 cleanup behavior is implemented.

## Demo-first pivot

- The owner approved an isolated offline demo runtime on 2026-10-25 so the core product story can be demonstrated before hosted authentication is accepted.
- ADR 0006 and `docs/plans/2026-10-25-demo-first-mvp.md` govern D01.
- D01 uses fictional personas, synthetic local data, validated AsyncStorage persistence, deterministic reset, and a permanent demo disclosure.
- D01 must not be described as proof of real authentication, cloud synchronization, RLS enforcement, uploads, GPS, payments, identity verification, or AI inference.
- Production auth remains the default runtime and its deferred acceptance gates remain tracked as M03B.

## Exact next steps

1. Rehearse the 3-5 minute competition judging presentation using `docs/DEMO_RUNBOOK.md`.
2. Compile and package the standalone Android release APK using `docs/COMPETITION_BUILD.md`.
3. Validate APK installation and launch on physical Android device (Infinix X6840 or competition test device).
4. Maintain M03B hosted OAuth acceptance deferred until operator-managed credentials and live physical device tests are scheduled.

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
