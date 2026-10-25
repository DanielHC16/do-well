# Milestone M09: Work Submission, Revision, and Approval Implementation Plan

## 1. Executive Summary & Goals
Deliver Milestone M09 ([Issue #10](https://github.com/DanielHC16/do-well/issues/10)), completing the core lifecycle for task assignments:
- Allow assigned workers to submit work with completion notes and version tracking.
- Allow employers to review submissions, request revisions with feedback notes, or approve completion atomically.
- Maintain an immutable, append-only submission history with version incrementing (v1, v2, ...).
- Provide live activity notifications across participants: `work_submitted`, `revision_requested`, and `assignment_completed`.
- Keep external service costs hard-capped at PHP 0 / USD 0 with deny-by-default security, server-side authorization, and zero paid infrastructure.

## 2. State Machine & Transitions

```
[active / in_revision] 
          │
          │ submit_assignment_work (worker)
          ▼
     [submitted]
     ├───► request_submission_revision (employer) ───► [revision_requested] ──┐
     │                                                                        │ submit_assignment_work (worker)
     │                                                                        ▼
     │                                                                   [submitted]
     │
     └───► approve_assignment_completion (employer) ──► [completed] (terminal)
```

- When worker submits on `active` or `revision_requested`:
  - New `submissions` record inserted with `version = max(version) + 1`, `status = 'submitted'`, and `submitted_at = now()`.
  - `assignments.status` updated to `submitted`.
  - Activity event `work_submitted` emitted for employer.
- When employer requests revision on `submitted`:
  - `submissions.status` updated to `revision_requested`, `review_note = p_review_note`, `reviewed_at = now()`.
  - `assignments.status` updated to `revision_requested`.
  - Activity event `revision_requested` emitted for worker.
- When employer approves completion on `submitted`:
  - `submissions.status` updated to `approved`, `reviewed_at = now()`.
  - `assignments.status` updated to `completed`, `completed_at = now()`.
  - Any remaining unapproved milestones marked `status = 'approved'`, `approved_at = now()`.
  - Activity event `assignment_completed` emitted for worker.

## 3. Database RPCs & Error Codes
- `submit_assignment_work(p_assignment_id uuid, p_note text, p_milestone_id uuid, p_client_request_id uuid)`
  - `42501`: Authentication required
  - `P0002`: Profile onboarding incomplete
  - `P0031`: Caller is not the assigned worker or assignment not found
  - `P0032`: Assignment is not in `active` or `revision_requested` status
  - `P0033`: Specified milestone does not belong to assignment
- `request_submission_revision(p_submission_id uuid, p_review_note text)`
  - `42501`: Authentication required
  - `P0034`: Review note must be non-empty and trimmed between 1 and 2000 chars
  - `P0035`: Submission not found
  - `P0036`: Caller is not the assignment employer
  - `P0037`: Submission is not in `submitted` status
  - `P0038`: Assignment is not in `submitted` status
- `approve_assignment_completion(p_submission_id uuid, p_review_note text)`
  - `42501`: Authentication required
  - `P0035`: Submission not found
  - `P0036`: Caller is not the assignment employer
  - `P0037`: Submission is not in `submitted` status
  - `P0038`: Assignment is not in `submitted` status
- `list_assignment_submissions(p_assignment_id uuid)`
  - Returns ordered submission history for assignment participants.
- `get_latest_assignment_submission(p_assignment_id uuid)`
  - Returns current submission for assignment participants.

## 4. Frontend & Domain Architecture
- `src/features/submissions/model/submission-schemas.ts`:
  - `SubmissionRecordSchema`: Validates submission row from database.
  - `SubmitWorkInputSchema`: Validates worker submission input.
  - `RequestRevisionInputSchema`: Validates employer revision input.
  - `ApproveSubmissionInputSchema`: Validates approval input.
- `src/features/submissions/data/submission-gateway.ts`:
  - `submissionGateway` wrapping Supabase RPCs with client-side retry/idempotency keys and typed error handling.
- `src/features/assignments/screens/WorkerAssignmentDetailScreen.tsx`:
  - Work submission form with character counter, review notes display on revision, and completion banner.
- `src/features/assignments/screens/EmployerAssignmentDetailScreen.tsx`:
  - Submission review card with worker note, "Approve & Complete" button, "Request Revision" modal/card with required notes.
- `src/features/shell/components/AuthenticatedActivityScreen.tsx`:
  - Update event formatters for `work_submitted`, `revision_requested`, and `assignment_completed`.

## 5. Verification Plan
- `npm run db:test`: pgTAP tests covering success, negative authorizations, error codes, and audit logging.
- `npm run db:lint`: 0 schema warnings.
- `npm run db:types:check`: Generated types current.
- `npm run format:check`: Clean Prettier check.
- `npm run lint`: Clean ESLint check.
- `npm run typecheck`: TypeScript strict check passes.
- `npm run test:run`: All Jest unit & component suites pass.
- `npx expo-doctor`: 20/20 checks pass.

