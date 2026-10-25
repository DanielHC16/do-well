# Milestone M12: Local Notifications & Private Image Evidence Implementation Plan

> **Goal:** Provide reliable on-device activity cues and private image evidence submission without making remote push or paid APIs a dependency, strictly within the PHP 0 / USD 0 budget ceiling.

**Architecture:**
- **Database & Storage RPCs**:
  - `begin_submission(assignment_id, milestone_id, note, client_request_id)` reserves a version and `pending_upload` submission without advancing aggregate work state.
  - Supabase Storage RLS (`submission-evidence` private bucket) permits authenticated uploads only matching `{worker_id}/{assignment_id}/{submission_id}/{file_id}.(jpg|jpeg|png|webp)` while submission is in `pending_upload`.
  - `finalize_submission(submission_id, files)` validates object paths and verifies each private Storage object and its trusted metadata before inserting `submission_files`, advancing submission/assignment state, and emitting `work_submitted` atomically.
  - `list_submission_files(submission_id)` returns files for authorized participants.
- **Client Evidence Pipeline**:
  - `expo-image-picker` with `microphonePermission: false`.
  - Pre-upload validation: format (`image/jpeg`, `image/png`, `image/webp`), size (max 5MB), image dimensions.
  - Staged upload to private Supabase Storage, followed by atomic finalization.
  - Employer review: generates short-lived signed URLs (1 hour expiry) via `createSignedUrl` for secure private viewing without public bucket exposure.
- **Local Notifications**:
  - `expo-notifications` adapter with named Android notification channels (`assignment_updates`, `milestone_alerts`).
  - Android 13+ `POST_NOTIFICATIONS` permission handling.
  - In-app activity sync: schedules per-account deduplicated local alerts for canonical unread recipient events already fetched by the app.
  - Allowlisted deep-link handling on cold-start and foreground notification responses leads to the relevant protected assignment screen.

**Tech Stack:**
- React Native / Expo SDK 58 New Architecture
- `expo-image-picker` (~58.0.x)
- `expo-notifications` (~58.0.x)
- Supabase PostgreSQL / RLS / Storage
- Zod schema validation
- TypeScript strict mode
- Jest 30 / RNTL 14+ / pgTAP

---

## 1. Database Migrations & pgTAP Tests

### Migration: `supabase/migrations/20261025000600_evidence_submission_rpcs.sql`
1. `begin_submission(p_assignment_id uuid, p_milestone_id uuid, p_note text, p_client_request_id uuid)`:
   - Worker authorization check (`P0031`), onboarding check (`P0002`), note length check (`P0039`).
   - Assignment status check (`P0032` - `active` or `revision_requested`).
   - Idempotency check on `(submitted_by, client_request_id)`.
   - Inserts submission with `status = 'pending_upload'`.
2. `finalize_submission(p_submission_id uuid, p_files jsonb)`:
   - Verifies caller is `submitted_by` (`P0031`), status is `pending_upload` (`P0040`).
   - Verifies each file object path matches format `{submitted_by}/{assignment_id}/{submission_id}/{file_id}.ext`, exists in the private bucket, and has matching stored MIME/size metadata.
   - Inserts into `submission_files`.
   - Updates submission to `status = 'submitted'`, `submitted_at = now()`.
   - Updates assignment to `status = 'submitted'`.
   - Emits `work_submitted` into `activity_events`.
3. `list_submission_files(p_submission_id uuid)`:
   - Participant check (`P0003`), returns files for submission.
4. Security: `security definer`, `set search_path = ''`, revoke from `public, anon`, grant strictly to `authenticated`.

### pgTAP Test: `supabase/tests/120_evidence_submission_rpcs.test.sql`
- Tests `begin_submission` happy path, non-worker rejection, idempotency.
- Tests `finalize_submission` happy path, path tampering rejection, non-submitter rejection, atomic assignment update, and activity event emission.
- Tests `list_submission_files` permissions.

---

## 2. Evidence Domain & Gateway (`src/features/submissions/`)

- Schemas (`src/features/submissions/model/submission-schemas.ts`):
  - `SubmissionFileSchema`: `id`, `submissionId`, `uploaderId`, `objectPath`, `mediaType`, `sizeBytes`, `createdAt`.
  - `BeginSubmissionParamsSchema`, `FinalizeSubmissionParamsSchema`.
  - `SelectedEvidenceImageSchema`: `uri`, `fileName`, `fileSize`, `mimeType`, `width`, `height`.
- Gateway (`src/features/submissions/data/submission-gateway.ts`):
  - `beginSubmission(...)`
  - `uploadEvidenceFile(path, blobOrUri, mimeType)`
  - `finalizeSubmission(...)`
  - `listSubmissionFiles(submissionId)`
  - `createEvidenceSignedUrl(objectPath, expiresInSeconds)`

---

## 3. Local Notifications System (`src/features/notifications/`)

- Schemas (`src/features/notifications/model/notification-schemas.ts`):
  - `NotificationChannelId`: `"assignment_updates" | "milestone_alerts" | "general_alerts"`
  - `NotificationPayload`: `id`, `title`, `body`, `channelId`, `data: { route: string, assignmentId?: string, gigId?: string }`.
- Service (`src/features/notifications/services/notification-service.ts`):
  - `requestPermissions(): Promise<boolean>`
  - `checkPermissions(): Promise<boolean>`
  - `configureNotificationChannels(): Promise<void>`
  - `scheduleLocalNotification(payload: NotificationPayload): Promise<string>`
  - `handleNotificationResponse(response: NotificationResponse, router: Router): void`

---

## 4. UI Screen Updates

1. `WorkerAssignmentDetailScreen.tsx`:
   - Evidence image attachment button using `expo-image-picker`.
   - Selected image preview thumbnail with remove button.
   - Progress and retry state during multi-step `begin -> upload -> finalize`.
2. `EmployerAssignmentDetailScreen.tsx`:
   - Evidence viewer displaying submitted photos using short-lived signed URLs.
3. Notification Setup & Sync:
   - Request notification permission from the explicit Activity-screen control.
   - Trigger deduplicated local notifications only for observed recipient activity updates, never the actor's just-completed mutation.

---

## 5. Quality & Verification Gates

- 12 pgTAP files / 200+ database tests.
- Full Jest test suite covering image selection validation, upload error recovery, signed URL generation, and notification dispatch.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npx expo-doctor`.

