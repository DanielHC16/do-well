# Session Handoff

## Snapshot

- **Last verified:** 2026-10-22 (Asia/Manila)
- **Completed milestone:** M01 — Expo initialization and Android development proof
- **Current milestone:** M02 — Supabase schema and authorization foundation
- **Status:** `IN PROGRESS`; do not mark M02 complete yet
- **Branch:** `feat/database-schema`
- **Base/default branch:** `main`
- **Current base commit:** `a205ae9` (`docs(roadmap): close M01 after merge (#18)`)
- **Remote:** `https://github.com/DanielHC16/do-well` (`PRIVATE`)
- **Issue:** [#3 — M02 Establish Supabase schema and authorization foundation](https://github.com/DanielHC16/do-well/issues/3)
- **M01 PR:** [#17](https://github.com/DanielHC16/do-well/pull/17), squash-merged as `d073c4b`

This file records repository evidence, not chat state. Re-run the verification commands before relying on it.

## M01 closeout

M01 is merged. The Expo SDK 58 app, strict TypeScript/Jest checks, local Android development build, and emulator/physical-device launch proof are on `main`. The authorized Infinix X6840/API 36 evidence remains at [`docs/evidence/m01-physical-device.png`](evidence/m01-physical-device.png).

## M02 implementation state

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

## Open product decisions

- Approve or revise the provisional eight-category list before M05.
- Define cancellation authority and outcomes for each active workflow state.
- Confirm the assignment/agreement acceptance sequence.
- Set evidence and abandoned-upload retention periods before M09 cleanup behavior is implemented.

## Exact next steps

1. Run the complete app and database verification gate from the clean install.
2. Review the migration, RLS, Storage, seed, generated-type, and documentation diffs together.
3. Update issue #3 and open the M02 PR only after the full local gate passes.
4. Keep M02 `IN PROGRESS` until review evidence satisfies its acceptance criteria.

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

Stop and update issue #3 instead of improvising if a step asks for a hosted Supabase link/apply, destructive remote migration, billing/payment setup, a privileged key in client code, history rewrite, production deployment, or an unresolved cancellation/agreement/retention decision.
