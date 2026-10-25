# Milestone M08 Architecture and Execution Plan: Agreements, Milestones, and Activity

## 1. Context and Problem Statement
In Milestone M07, we delivered worker applications and atomic worker selection, transitioning the gig from `published` to `closed` and instantiating an assignment in `proposed` status.
Milestone M08 governs the bilateral agreement contract, ordered milestones, and the unified auditable activity trail:
1. **Two-Party Agreement Confirmation**:
   - The selected worker reviews the proposed assignment terms (agreed title, description, amount, currency PHP).
   - The worker can **Confirm** (transitions assignment to `active`, sets `worker_confirmed_at = now()`, `started_at = now()`).
   - The worker can **Decline** (transitions assignment to `declined`, sets `cancelled_at = now()`, reopens gig to `published`).
   - The employer can **Cancel** a proposed assignment before worker confirmation (transitions to `cancelled`, sets `cancelled_at = now()`, reopens gig to `published`).
2. **Ordered Milestones**:
   - Employer defines structured milestone steps for the assignment (e.g. "Phase 1: Prep", "Phase 2: Execution", "Phase 3: Final Delivery").
   - Milestones maintain strict ordering (`position` 1..20, unique per assignment).
   - Worker transitions milestone to `in_progress`.
3. **Auditable Activity Trail**:
   - Secure server query RPC for `public.activity_events` filtered to `recipient_id = auth.uid()`.
   - Supports reading unread status and marking events as read.
   - Wires real activity stream into `AuthenticatedActivityScreen.tsx` replacing the static placeholder.
4. **Assignment Routes and UI**:
   - Worker assignment detail screen: `app/(protected)/worker/assignments/[assignmentId].tsx`.
   - Employer assignment detail screen: `app/(protected)/employer/assignments/[assignmentId].tsx`.
   - Direct link from `EmployerGigDetailScreen.tsx` to the active assignment.

## 2. Security, RLS & Hard Constraints
1. **Zero External-Service Budget**: Hard ceiling of PHP 0 / USD 0 across all layers.
2. **Deterministic State Machine Enforcement**:
   - `confirm_assignment`: Only `worker_id = auth.uid()` can confirm. Status must be `proposed`.
   - `decline_assignment`: Only `worker_id = auth.uid()` can decline. Status must be `proposed`.
   - `cancel_assignment`: Only `employer_id = auth.uid()` can cancel. Status must be `proposed`.
   - Row-level lock (`SELECT ... FOR UPDATE`) prevents concurrent double-action.
3. **Privacy & Access Control**:
   - Unrelated users cannot view assignments, milestones, or activity events (enforced by RLS `assignments_read_participants`, `milestones_read_assignment_participants`, `activity_events_read_recipient`).
4. **Audit Logging & Deduplication**:
   - Activity events strictly follow `^[a-z][a-z0-9_]*$` constraint.
   - Events emitted: `assignment_confirmed`, `assignment_declined`, `assignment_cancelled`, `milestone_created`, `milestone_started`.
   - Dedupe keys prevent event replay.

## 3. Database Architecture & RPC Design
- Migration: `supabase/migrations/20261025000400_assignment_and_milestone_rpcs.sql`
- Security Definer Functions with `set search_path = ''`:
  1. `confirm_assignment(p_assignment_id uuid) returns public.assignments`
  2. `decline_assignment(p_assignment_id uuid) returns public.assignments`
  3. `cancel_proposed_assignment(p_assignment_id uuid) returns public.assignments`
  4. `create_assignment_milestone(p_assignment_id uuid, p_title text, p_description text, p_due_at timestamptz) returns public.milestones`
  5. `start_assignment_milestone(p_milestone_id uuid) returns public.milestones`
  6. `list_assignment_milestones(p_assignment_id uuid) returns setof public.milestones`
  7. `get_assignment_detail(p_assignment_id uuid) returns jsonb`
  8. `list_user_activity(p_limit int, p_offset int) returns setof public.activity_events`
  9. `mark_activity_read(p_event_id uuid) returns public.activity_events`

## 4. Frontend & Route Integration
- Domain schemas: `src/features/assignments/model/assignment-schemas.ts`
  - Validation for AssignmentRecord, MilestoneRecord, ActivityEventRecord, and milestone creation.
- Gateway: `src/features/assignments/data/assignment-gateway.ts`
  - Gateway methods for confirmation, decline, cancellation, milestone management, and activity listing.
- UI Components:
  - `WorkerAssignmentDetailScreen.tsx` with terms review, confirmation/decline actions, and milestone checklist.
  - `EmployerAssignmentDetailScreen.tsx` with assignment status, milestone creation modal, and progress tracker.
  - `AuthenticatedActivityScreen.tsx` wired to live activity feed with timestamps, event icons/tags, and navigation links.
  - Routes:
    - `app/(protected)/worker/assignments/[assignmentId].tsx`
    - `app/(protected)/employer/assignments/[assignmentId].tsx`

## 5. Test Strategy
1. **Database Tests (pgTAP)**: `supabase/tests/100_assignment_and_milestone_rpcs.test.sql`
   - Worker confirms proposed assignment -> active, sets timestamps, emits `assignment_confirmed`.
   - Non-worker cannot confirm assignment (error `P0020`).
   - Cannot confirm non-proposed assignment (error `P0021`).
   - Worker declines proposed assignment -> declined, reopens gig to published, emits `assignment_declined`.
   - Employer cancels proposed assignment -> cancelled, reopens gig to published, emits `assignment_cancelled`.
   - Employer creates milestones (1..20), enforces title length, emits `milestone_created`.
   - Worker starts milestone -> in_progress, emits `milestone_started`.
   - Activity query returns recipient events only.
2. **Domain & Gateway Unit Tests**:
   - `src/features/assignments/model/__tests__/assignment-schemas.test.ts`
   - `src/features/assignments/data/__tests__/assignment-gateway.test.ts`
3. **Screen Tests**:
   - `src/features/assignments/screens/__tests__/WorkerAssignmentDetailScreen.test.tsx`
   - `src/features/assignments/screens/__tests__/EmployerAssignmentDetailScreen.test.tsx`
   - `src/features/shell/components/__tests__/AuthenticatedActivityScreen.test.tsx`
4. **End-to-End Pipeline**:
   - `npm run db:test`, `npm run db:lint`, `npm run db:types:check`
   - `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:run`
   - `npx expo-doctor`

