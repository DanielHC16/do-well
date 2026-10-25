# Milestone M07 Architecture and Execution Plan: Worker Applications and Atomic Selection

## 1. Context and Problem Statement
In Milestone M06, we delivered nearby and remote gig discovery with transparent filtering and explainable recommendation tags.
Milestone M07 activates the two-sided marketplace transaction:
1. **Worker Application**: A worker applies to a published gig with an optional qualification/availability message. A worker may only apply once per gig (enforced by schema partial index `applications_one_live_worker_per_gig_idx`). Applications are strictly private between the applicant and the gig employer.
2. **Worker Application Withdrawal**: A worker can withdraw a pending application before the employer makes a decision.
3. **Employer Applicant Review**: The employer views private applications submitted to their gig, including applicant profile details, applied timestamp, and message.
4. **Atomic Worker Selection**: The employer selects exactly one applicant. The transaction must lock the gig, accept the winning application, reject all competing pending applications, transition the gig status to closed, atomically instantiate a new `proposed` assignment, record activity events, and ensure idempotency via `client_request_id`.

## 2. Hard Requirements & Constraints
1. **Zero External-Service Budget**: Hard ceiling of PHP 0 / USD 0.
2. **Atomic Single-Selection & Concurrency Safety**:
   - `SELECT ... FOR UPDATE` row locks on both the gig and the application.
   - Enforce schema constraint: exactly one accepted application per gig (`applications_one_accepted_per_gig_idx`), exactly one assignment per application, and gig status transitions to `closed`.
   - Prevent race conditions where two simultaneous selections hire multiple workers.
3. **Privacy Protection**:
   - Other workers must NEVER see who applied or what they wrote (enforced by RLS `applications_read_authorized`).
   - Unrelated employers must NEVER see applications for gigs they do not own.
4. **Idempotency**:
   - `apply_to_gig` takes `p_client_request_id uuid` and respects `applications_idempotency_unique (worker_id, client_request_id)`.
   - `select_worker_atomic` takes `p_client_request_id uuid` and respects `assignments_idempotency_unique (employer_id, client_request_id)`.
   - Replays return the existing record without side effects.
5. **No Self-Dealing**:
   - An employer cannot apply to their own gig (`worker_id <> employer_id`).
6. **Eligibility Guard**:
   - Worker must have completed onboarding (`profiles.onboarding_completed_at is not null`).
   - Gig must be in `status = 'published'`.

## 3. Database Architecture & RPC Design
- Migration: `supabase/migrations/20261025000300_application_and_selection_rpcs.sql`
- Security Definer Functions with `set search_path = ''`:
  1. `apply_to_gig(p_gig_id uuid, p_message text, p_client_request_id uuid) returns public.applications`
     - Validates caller authentication, profile existence, and completed onboarding.
     - Validates gig exists, `status = 'published'`, and `employer_id <> auth.uid()`.
     - Idempotency: returns existing application if `(worker_id, client_request_id)` exists.
     - Live application check: rejects if pending/accepted application already exists for `(gig_id, worker_id)`.
     - Inserts into `public.applications` with `status = 'pending'`.
     - Emits `gig.application_received` in `public.activity_events` for the employer.
  2. `withdraw_application(p_application_id uuid) returns public.applications`
     - Validates caller owns application (`worker_id = auth.uid()`).
     - Idempotently returns if already `withdrawn`.
     - Rejects if status is `accepted` or `rejected`.
     - Sets `status = 'withdrawn'` and `decided_at = now()`.
     - Emits `gig.application_withdrawn` in `public.activity_events`.
  3. `select_worker_atomic(p_application_id uuid, p_client_request_id uuid) returns public.assignments`
     - Idempotency check: returns existing assignment if `(employer_id, client_request_id)` exists.
     - Locks gig with `for update`. Validates `employer_id = auth.uid()` and `status = 'published'`.
     - Locks target application with `for update`. Validates `gig_id = gig.id` and `status = 'pending'`.
     - Sets target application `status = 'accepted', decided_at = now()`.
     - Sets other pending applications for gig to `status = 'rejected', decided_at = now()`.
     - Closes gig `status = 'closed', closed_at = now()`.
     - Inserts `public.assignments`:
       - `agreed_title = gig.title`
       - `agreed_description = gig.description`
       - `agreed_amount = gig.budget_amount`
       - `currency = gig.currency`
       - `status = 'proposed'`
       - `employer_confirmed_at = now()`
     - Emits `gig.applicant_selected` activity event for selected worker.
     - Emits `gig.application_rejected` activity event for rejected workers.
  4. Query Helper RPCs:
     - `list_gig_applicants(p_gig_id uuid) returns table (...)`
       Returns applicant applications with profile summary for the gig employer.
     - `get_worker_application_for_gig(p_gig_id uuid) returns public.applications`
       Allows worker to check their current application status for a given gig.

## 4. Frontend & Route Integration
- Domain schemas: `src/features/applications/model/application-schemas.ts`
  - Validation for application submission form (`message` <= 1000 chars).
  - Validation for application records, applicant lists, and selection responses.
- Gateway: `src/features/applications/data/application-gateway.ts`
  - `applyToGig(gigId, message, clientRequestId)`
  - `withdrawApplication(applicationId)`
  - `selectWorkerAtomic(applicationId, clientRequestId)`
  - `listGigApplicants(gigId)`
  - `getWorkerApplicationForGig(gigId)`
- UI Integration:
  - Worker Gig Detail Screen (`WorkerGigDetailScreen.tsx`):
    - Replace the "Coming in M07" placeholder with live application form modal / bottom sheet.
    - If already applied: show current status badge (`PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`) with a "Withdraw Application" button if pending.
  - Employer Gig Detail Screen (`EmployerGigDetailScreen.tsx`):
    - Add "Applicants" section showing applicant cards (name, area, message, applied date).
    - "Select Worker" action with confirmation prompt.
    - Status badges (`ACCEPTED`, `REJECTED`).
    - If worker selected: display assignment banner linking to assignment.
  - Activity Trail:
    - `AuthenticatedActivityScreen.tsx` displaying live events (`gig.application_received`, `gig.applicant_selected`).

## 5. Test Strategy
1. **Database Tests (pgTAP)**: `supabase/tests/090_application_and_selection_rpcs.test.sql`
   - Proves caller cannot apply to own gig.
   - Proves worker cannot apply twice to same gig.
   - Proves worker can withdraw pending application.
   - Proves atomic worker selection accepts winning applicant, rejects competitors, closes gig, and creates assignment.
   - Proves idempotency of repeated selection with same `client_request_id`.
   - Proves non-owner cannot select worker.
2. **Domain & Gateway Unit Tests**:
   - `src/features/applications/model/__tests__/application-schemas.test.ts`
   - `src/features/applications/data/__tests__/application-gateway.test.ts`
3. **Component & Screen Tests**:
   - `src/features/discovery/screens/__tests__/WorkerGigDetailScreen.test.tsx` (application form & withdrawal)
   - `src/features/gigs/screens/__tests__/EmployerGigDetailScreen.test.tsx` (applicant review & atomic selection)
4. **End-to-End Quality Pipeline**:
   - `npm run db:lint`, `npm run db:test`, `npm run db:types:check`
   - `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:run`
   - `npx expo-doctor`
