# Implementation Plan: M14 Security Verification & Competition Build

**Milestone:** M14 — Verify security and produce competition build  
**Branch:** `test/security-validation`  
**Tracking Issue:** [#15 — [M14] Verify security and produce competition build](https://github.com/DanielHC16/do-well/issues/14)  
**Dependencies:** M01–M13 complete  
**Budget:** Strictly PHP 0 / USD 0  

---

## 1. Objectives & Quality Gates

M14 freezes P0 scope, conducts an exhaustive security and privacy verification, validates critical end-to-end competition flows, confirms Android compilation and bundle readiness, and documents judging and disaster recovery runbooks.

### Acceptance Criteria:
1. **Security & Authorization Verification**:
   - Zero tracked or bundled secrets in git or client bundles (`SUPABASE_SECRET_KEY`, `GOOGLE_CLIENT_SECRET`, database passwords).
   - Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` exposed in public config.
   - Comprehensive test suite asserting RLS, RPC authorization boundaries, worker/employer tenant isolation, and private Storage policies.
   - Dependency audit clean of high/critical vulnerabilities.
2. **Truth-in-Advertising & Privacy**:
   - Zero-cost AI features clearly disclose deterministic heuristic fallback when no LLM is configured.
   - Location service confirms coarse/foreground-only usage with zero background tracking.
   - Notification service confirms local on-device scheduling without unverified remote push dependencies.
   - Demo mode clearly discloses synthetic local data and offline isolation.
3. **End-to-End Competition Workflow Tests**:
   - Automated end-to-end test suite covering the full multi-role competition scenario: Employer gig creation -> AI brief -> Worker search -> Worker apply -> Employer select & agreement -> Worker evidence submission -> Employer approval & completion.
   - Tests cover both online workflow and offline demo sandbox.
4. **Competition Build & Runbook**:
   - Expo Android export (`npx expo export --platform android`) passes with 0 bundle errors.
   - `eas.json` preview profile configured for internal APK generation.
   - Authored `docs/COMPETITION_BUILD.md` (build commands, signing instructions, artifact verification).
   - Authored `docs/DEMO_RUNBOOK.md` (judging walkthrough, 3-5 minute demo script, offline contingency).
   - Authored `docs/DISASTER_RECOVERY.md` (recovery procedures, fail-safe demo pivot).
5. **Quality Verification**:
   - `npm run format:check`
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npx expo-doctor` (20/20 checks)

---

## 2. File Implementation Map

| File Path | Purpose |
| --- | --- |
| `tests/security/secret-exposure.test.ts` | Secret scan assertion ensuring no service keys or private env vars leak into client code or config. |
| `tests/security/authorization-boundaries.test.ts` | Multi-role authorization and negative security tests (worker/employer role enforcement, storage protection). |
| `tests/security/truth-in-advertising.test.ts` | Validates public disclaimers for AI generation, location privacy, push notifications, and demo mode. |
| `tests/e2e/competition-workflow.test.ts` | End-to-end multi-role competition flow test suite. |
| `docs/COMPETITION_BUILD.md` | Android release and APK build instructions, checksum calculation, and signing architecture. |
| `docs/DEMO_RUNBOOK.md` | Authoritative 3-5 minute live competition judging script and demo runbook. |
| `docs/DISASTER_RECOVERY.md` | Failure handling, network offline contingency, and local recovery drill. |
| `docs/IMPLEMENTATION_ROADMAP.md` | Final roadmap status update marking M14 COMPLETED. |
| `docs/SESSION_HANDOFF.md` | Final session handoff snapshot and milestone closeout. |

---

## 3. Step-by-Step Execution Plan

### Step 1: Security Verification Suite
- Write `tests/security/secret-exposure.test.ts` scanning environment keys, `app.config.ts`, and source directories.
- Write `tests/security/authorization-boundaries.test.ts` testing gateway and RPC boundaries.
- Write `tests/security/truth-in-advertising.test.ts` checking disclaimers and UI contracts.
- Run `npm audit --omit=dev`.

### Step 2: End-to-End Competition Workflow Tests
- Write `tests/e2e/competition-workflow.test.ts` orchestrating complete employer-worker gig lifecycle from posting to payout/completion.
- Verify both live state machine transitions and demo repository offline transitions.

### Step 3: Android Export & Build Verification
- Execute `npx expo export --platform android` to verify static JavaScript bundle generation and asset compilation.
- Author `docs/COMPETITION_BUILD.md`.
- Author `docs/DEMO_RUNBOOK.md`.
- Author `docs/DISASTER_RECOVERY.md`.

### Step 4: Full Quality Gates & Final Project Closeout
- Execute full verification suite (`format:check`, `lint`, `typecheck`, `test:run`, `expo-doctor`).
- Update `docs/IMPLEMENTATION_ROADMAP.md` and `docs/SESSION_HANDOFF.md`.
- Commit using Conventional Commits, push branch, open PR #37, and merge into `main`.
