# Security and Row-Level Security

## Status and security model

M02 implemented the local authorization foundation for this M02-M14 contract and merged it in PR #19. It is not hosted or deployed. Local migrations enable and force RLS, narrow grants, protect the private evidence bucket, and keep unimplemented workflow writes fail-closed. The latest verified run covered 5 functional pgTAP files / 50 passing tests, 5 performance assertions, clean database lint, and current generated types. Real JWT HTTP integration remains deferred to M03. Supabase Auth establishes identity; PostgreSQL RLS and narrowly granted transactional functions establish authority. Hiding controls in the app is never an authorization check.

Primary references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database function security](https://supabase.com/docs/guides/database/functions), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), and [Securing Edge Functions](https://supabase.com/docs/guides/functions/auth).

Security invariants:

- Every request acts as `auth.uid()` from a verified Supabase access token. User IDs in request bodies are ignored.
- One account can act as worker and employer. Authorization derives from ownership/participation, never `preferred_mode`.
- The Expo bundle contains only the project URL and publishable key. Secret/service-role/provider credentials remain server-side.
- Marketplace state changes are allowlisted transitions executed atomically and idempotently.
- Exact locations, evidence objects, application messages, reports, and model-provider credentials are private.
- Model output, object metadata, deep links, and all client input are untrusted until schema/ownership validation passes.

## Grants before policies

RLS does not replace SQL privileges. Migrations should:

1. revoke broad table mutation privileges from `anon` and `authenticated`;
2. grant `SELECT`/specific column updates only where the matrix permits;
3. grant `EXECUTE` only on named RPCs to `authenticated`;
4. revoke all workflow-function execution from `public` and `anon`;
5. enable and force RLS on every `public` user-data table; and
6. expose no table through a view unless the view uses `security_invoker = true` (PostgreSQL 15+) and has a tested reason to exist.

`service_role` bypasses RLS and must never be used by the mobile client. Edge Functions should prefer the caller's bearer token. If one function genuinely needs service-role access, isolate that client to the smallest code path, validate the caller first, and never accept arbitrary table names, filters, paths, or SQL.

## RLS policy matrix

`own` means the relevant identity equals `auth.uid()`. `participant` means the current user is the assignment's `employer_id` or `worker_id`. All subqueries use indexed foreign keys.

| Resource                | Read                                                                                     | Insert                                              | Update                                                                                                                      | Delete                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `profiles`              | authenticated users may read safe profile-card columns; no email/provider data is stored | trigger only                                        | own `display_name`, `avatar_path`, `bio`, `preferred_mode`, `home_area`; onboarding completion through a validated RPC only | none from client                                         |
| `worker_preferences`    | own                                                                                      | own `profile_id = auth.uid()`                       | own; identity immutable                                                                                                     | own before an active assignment, otherwise retain/update |
| `gigs`                  | published; or owner; or user with application/assignment                                 | own employer, `status = draft`, onboarding complete | owner while current and new state are `draft`; workflow changes via RPC                                                     | owner only when draft and no application/assignment      |
| `gig_private_locations` | gig owner; or confirmed non-terminal assignment worker                                   | gig owner while gig draft                           | gig owner while gig draft                                                                                                   | gig owner while gig draft                                |
| `applications`          | own worker; or employer owning parent gig                                                | RPC only                                            | RPC only                                                                                                                    | none                                                     |
| `assignments`           | participant                                                                              | RPC only                                            | RPC only                                                                                                                    | none                                                     |
| `milestones`            | assignment participant                                                                   | selection/agreement RPC only                        | workflow RPC only                                                                                                           | none                                                     |
| `submissions`           | assignment participant                                                                   | RPC only                                            | review RPC only                                                                                                             | none                                                     |
| `submission_files`      | assignment participant                                                                   | finalization RPC only                               | none                                                                                                                        | cleanup service only                                     |
| `activity_events`       | own recipient                                                                            | trusted RPC/server only                             | `mark_activity_read` RPC only                                                                                               | none in MVP                                              |
| `reports`               | own reporter; trusted moderator/server                                                   | `create_report` RPC only                            | trusted moderator/server only                                                                                               | none                                                     |
| `ai_request_log`        | no direct client access                                                                  | reservation RPC/server                              | finalization RPC/server                                                                                                     | cleanup service only                                     |

The profile read policy is safe only while `profiles` contains public-card fields. Adding phone, email, precise address, birth date, verification data, or moderation flags requires a private table and a migration/RLS review; never append such columns casually.

### Representative policy shapes

These are patterns for migrations, not copy-paste substitutes for integration tests.

```sql
-- A user sees a gig if it is published or they have a legitimate relationship.
using (
  status = 'published'
  or employer_id = (select auth.uid())
  or exists (
    select 1 from public.applications a
    where a.gig_id = gigs.id and a.worker_id = (select auth.uid())
  )
  or exists (
    select 1 from public.assignments x
    where x.gig_id = gigs.id
      and (x.worker_id = (select auth.uid()) or x.employer_id = (select auth.uid()))
  )
)
```

```sql
-- Assignment participants only.
using (
  employer_id = (select auth.uid())
  or worker_id = (select auth.uid())
)
```

Use `(select auth.uid())` in policies so PostgreSQL can init-plan the value, following Supabase's RLS performance guidance. Never put authorization data in user-editable `raw_user_meta_data`; ownership lives in relational columns. If an admin role is later introduced, use server-managed `app_metadata`/custom claims and still test it separately.

## Secure transactional functions

Functions named in `DATABASE_SCHEMA.md` are the planned public workflow mutation boundary. M02 deliberately does not create no-op RPCs: actual transactional implementations are deferred to their workflow milestones, while direct mutation grants/policies remain absent so those paths fail closed. Each future function must:

- accept business inputs and an idempotency UUID, never an acting user ID;
- reject a null `auth.uid()` and incomplete onboarding;
- validate lengths, enum values, timestamps, ownership, and current state again in SQL;
- lock the aggregate root (`SELECT ... FOR UPDATE`) before checking/writing;
- perform all related rows and activity events in one transaction;
- return the previously created resource for a repeated idempotency key;
- use parameterized SQL only;
- raise stable domain codes that the data layer maps to the standard error shape;
- use `SECURITY INVOKER` by default; and
- when `SECURITY DEFINER` is necessary, set `search_path = ''`, schema-qualify every reference, use an unprivileged owner where possible, revoke default execute, and grant only to `authenticated`.

Recommended database error mapping:

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "This action is no longer available.",
    "details": []
  }
}
```

Do not send PostgreSQL messages, function source, stack traces, policies, or provider payloads to clients. Expected conflicts map to `409`, invalid inputs to `422`, authentication to `401`, authorization to `403`, missing/non-visible rows to `404`, throttles to `429`, and upstream failure to `503`.

### Concurrency cases that must be proven

- Two employer devices select different applications simultaneously: exactly one live assignment wins; the other gets a conflict.
- The same application/submission request is retried after a timeout: the original row is returned and no second event is emitted.
- An employer reviews an older submission while a new version arrives: the older review fails.
- A gig closes while a worker applies: either the application commits before close or it is rejected; never a pending application on a closed gig.
- The last milestone is approved twice: completion happens once.

## Storage authorization

Create a private bucket named `submission-evidence`; never make it public. Use a canonical path:

```text
{workerUserId}/{assignmentId}/{submissionId}/{randomUuid}.{allowlistedExtension}
```

The filename is generated by the app from random data, never from user text. The first segment must equal `auth.uid()`. Database metadata stores relative paths only; signed URLs are short-lived responses and are never persisted.

Storage policies on `storage.objects` must enforce:

| Operation       | Rule                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Insert          | bucket matches; first folder equals `auth.uid()`; assignment worker equals caller; submission belongs to assignment/caller; object extension and declared MIME are allowlisted |
| Select/download | caller is assignment worker or employer via the referenced `submission_files` row                                                                                              |
| Update          | denied; evidence is immutable                                                                                                                                                  |
| Delete          | denied to ordinary clients; cleanup service handles abandoned/rejected objects                                                                                                 |

Client-declared MIME and size are advisory. Before finalizing `submission_files`, trusted code verifies actual object metadata and enforces the proposed P0 limit of 5 MiB per file, at most 5 files per submission, and JPEG/PNG/WebP only. Strip EXIF/location metadata on-device when supported or during a later trusted processing step; until verified, warn users not to upload images containing sensitive location information. Never render uploaded content as HTML.

Upload flow under weak connectivity:

1. create/resume the local submission draft;
2. call `begin_submission` with a client idempotency key to allocate or recover one `pending_upload` submission/version and authorized object-path prefix without advancing assignment state;
3. upload each object to its exact authorized path;
4. call `finalize_submission` with the reserved submission ID, the same idempotency key, paths, MIME types and byte sizes;
5. server verifies every object, records metadata, advances state and emits events;
6. stale reservations are marked `abandoned`, and their unattached objects are enumerated and removed by an explicit maintenance procedure after the retention decision.

The assignment is not considered submitted until step 4 commits.

## Boundary validation

Use strict Zod schemas in the TypeScript client and Edge Functions, derived from shared domain constraints but not from untrusted generated types. SQL checks are the final boundary.

- Reject unknown keys for mutation/AI payloads.
- Normalize by Unicode-aware trim; do not silently coerce numbers, dates, booleans, or UUIDs.
- Cap arrays before iteration and text before logs/model prompts.
- Parse ISO timestamps and compare them server-side.
- Category, state, MIME, event type, and report category are allowlists.
- Coordinates must be finite and in range. Public gig coordinates are coarse; exact values go only to private tables.
- Treat URLs as structured values with an allowlist of schemes/hosts; evidence APIs accept object paths, not caller-controlled fetch URLs.
- Display user text as React Native text, not HTML. If rich text is added, use an allowlist sanitizer and test malicious payloads.
- Model output is data only and is revalidated by the same gig-draft schema before display or persistence.

## Rate limiting and abuse controls

Rate limits are product controls in addition to platform quotas. Limits are proposed starting values and must be configurable without an app release.

| Action              |               Proposed limit | Enforcement                                                  |
| ------------------- | ---------------------------: | ------------------------------------------------------------ |
| Apply               |      10/hour and 30/day/user | RPC count plus unique active application and idempotency key |
| Publish gig         |                  10/day/user | RPC count on owned gigs                                      |
| Report              |       5/hour and 10/day/user | RPC count plus idempotency key                               |
| AI brief            | 5/10 minutes and 20/day/user | atomic `ai_request_log` reservation before provider call     |
| Submission attempts |           10/hour/assignment | RPC count; revisions still bounded                           |
| Signed evidence URL |           30/10 minutes/user | Edge Function or RPC; short expiry                           |

Use database time, not a client clock. Reservation must be atomic so parallel requests cannot all pass a count check. Hosted-provider quotas are a second hard ceiling; exhaustion returns `429`/fallback and never upgrades a plan. The local inference gateway adds per-token-bucket limits by user and source device.

Abuse/reporting controls:

- Only authenticated users with visible context may report; the report captures the immutable IDs, not copied PII.
- A reported user never sees reporter identity or moderation notes.
- The mobile client has no moderator function. Review uses the Supabase dashboard or a later audited admin tool with MFA and separate authorization.
- Block obvious unsafe/illegal categories at publish validation; reporting is not a substitute for prevention.
- Log request ID, actor UUID, action, result code and duration. Do not log email, access/refresh tokens, exact coordinates, addresses, full report text, image URLs, prompts, or outputs.
- Basic device/IP controls may supplement user limits at an Edge gateway, but IP is not a stable identity and must not be the only defense.

## Authentication and Edge Function boundary

Every restricted Edge Function requires `Authorization: Bearer <Supabase access token>`, validates it with the project's Auth service/JWT verification path, and derives the caller from the result. Do not trust a decoded-but-unverified JWT. M02's SQL tests exercise database roles/claims directly; real JWTs through the local HTTP/Auth path are deferred to M03. See `AUTHENTICATION.md` for session details.

Provider secrets live only in Supabase Function secrets or the local gateway environment. They are never `EXPO_PUBLIC_*`, database rows, prompt text, issue content, or logs. CORS is not an authentication control. Browser-origin allowlists may be added for web, but native clients still require JWTs.

The local Ollama API has no authentication by default ([Ollama authentication](https://docs.ollama.com/api/authentication)); never bind it directly to the LAN. The approved experiment topology is phone -> authenticated, rate-limited local gateway -> loopback-only Ollama. Details are in `AI_STRATEGY.md`.

## Security verification plan

Run repository integration tests against a disposable local Supabase/PostgreSQL instance. The current verified M02 baseline is 5 functional pgTAP files / 50 tests plus 5 separately invoked query-plan assertions after a clean reset. Tests use database role/claim impersonation for local policy proof; M03 must add publishable/anonymous HTTP-path assertions with real user JWTs. Elevated setup is allowed only to create fixtures.

### Required positive tests

- users read/update their profile and private preferences;
- worker reads a published gig, applies once, sees their application;
- owning employer sees applicants and atomically selects one;
- assignment participants see milestones/submissions/evidence;
- worker submits and employer reviews the newest submission;
- recipient marks only their activity events read;
- reporter creates and reads their report without moderation fields;
- exact location becomes visible to the confirmed worker and not before.

### Required negative tests

- anonymous reads of every table and bucket fail;
- another user cannot read preferences, private location, application message, assignment, submission, evidence, activity, report, or AI log;
- worker cannot apply to own gig, select themselves, alter status, forge employer/worker IDs, or review work;
- employer cannot inspect applications to another employer's gig or submit as a worker;
- preferred UI mode changes no authorization outcome;
- direct inserts/updates to workflow tables and state columns fail;
- path traversal, another user's first path segment, wrong bucket, executable/SVG MIME, oversized image, and object overwrite fail;
- duplicate idempotency keys return the same result; different concurrent keys cannot violate one-worker constraints;
- expired, malformed, wrong-project, and absent JWTs fail;
- malicious text/JSON/SQL fragments remain inert and validation errors expose no internals;
- AI output with extra keys, excessive lengths, HTML/script, or invalid values is rejected and not saved.

### Operational checks before release

- Supabase security and performance advisors reviewed with findings recorded.
- RLS enabled/forced on every exposed table; no accidental grants or `SECURITY DEFINER` views.
- Function owner, execute grants and `search_path` inspected from catalog queries.
- Secret scan, Expo public config inspection, and Android bundle inspection find no privileged credential.
- Storage bucket is private and signed URL expiry is tested.
- Service-role/provider secrets are rotated if ever exposed and are absent from Git history.
- Abuse limits return deterministic `429` responses and remain fail-closed under concurrency.

Only the explicitly recorded M02 pgTAP baseline is currently claimed. The remaining items are acceptance gates for their corresponding milestones.
