# Offline and Weak-Connectivity Strategy

## Scope and terminology

Do Well is **local-first geographically**, not an offline-first distributed system. P0 must preserve user work and fail clearly under weak connectivity, but it does not promise unattended background synchronization.

Three capabilities are tracked separately:

| Level | Capability | P0 state | What it does not imply |
|---|---|---|---|
| L1 | Offline reading of previously cached information | **Required, limited** | Data is not current and no mutation is accepted |
| L2 | Offline drafting and explicit pending actions | **Required for drafts; limited for actions** | A queued item is not completed until the server confirms it |
| L3 | Reliable background synchronization | **Deferred/P1** | Caching, NetInfo, or retry-on-focus is not background sync |

Every screen must distinguish `loading`, `empty`, `offline-with-cache`, `error`, `retrying`, `pending`, `confirmed`, and `rejected` where those states apply. A network error must never be rendered as an empty result.

## L1: offline-readable cache

Cache only the smallest useful read models:

- the most recent published-gig list and filters;
- gig summaries the user deliberately opened;
- the signed-in user's profile summary;
- active assignments, milestones, submissions, and recent activity needed during the demo.

Each cached record stores `fetchedAt`, source query/version, and server `updatedAt`. The UI shows an offline banner and the last refresh time. Expired data may remain readable but must be visibly stale. Sensitive evidence URLs, private addresses, privileged claims, and signed URLs must not be treated as durable cache data.

TanStack Query remains the in-memory/server-state boundary. A persistent adapter may restore selected queries, but queries must be allowlisted rather than serializing the entire cache. Its official persistence plugin requires explicit restore/save lifecycle handling and supports cache version invalidation through a buster ([TanStack Query persistence](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)). Persistent storage should be versioned and have a migration/clear strategy. On logout or account change, delete user-scoped cached data and drafts before showing another account.

Authorization is always rechecked online. A cached screen can explain prior state, but it cannot authorize a new application, employer action, evidence download, or completion transition.

## L2: drafts and pending actions

### Drafts

Persist local drafts for gig creation, applications, agreements, and submissions. A draft contains:

- a local UUID;
- form schema version;
- owner user ID;
- validated fields;
- creation/update timestamps;
- optional app-controlled image path;
- server entity/version if editing an existing record.

Save after meaningful edits with a debounce and on backgrounding. Restore only when the same authenticated user returns. If a schema changed, migrate explicitly or offer an export/copy path before discarding incompatible fields.

### Pending mutations

P0 should queue only operations that are safe, understandable, and protected by server idempotency. High-consequence operations such as selecting a worker, accepting an agreement, approving work, or completing a gig should normally require a live confirmation response rather than silently queueing.

Every retryable mutation carries a client-generated idempotency key. The server stores or constrains the key with the authenticated actor and operation so repeated taps/timeouts return the original result. Client states are:

```text
draft -> sending -> confirmed
                 -> failed_retryable -> sending
                 -> rejected_final
```

`sending` must survive only when the app has durable evidence that a request may have reached the server. After timeout, query by idempotency key before creating a replacement request. Never report success based only on an HTTP request being sent.

For image-backed submissions, use two phases:

1. persist the form and app-controlled local image reference;
2. call `begin_submission` online with an idempotency key to reserve one `pending_upload` submission/version and authorized path;
3. upload and verify each private object only under that reservation;
4. call `finalize_submission` with the same reservation/key so the server atomically records file metadata and advances work state;
5. retain the local file until the finalization confirmation is displayed.

If upload succeeds but finalization fails, retry `finalize_submission` against the same reservation and objects; never create a replacement version. A later reviewed cleanup procedure abandons expired reservations and removes their unattached objects.

## L3: background synchronization

Reliable background synchronization is **not P0**. It requires OS scheduling, battery constraints, authentication refresh while backgrounded, ordered/conflicting mutations, durable leases, and extensive device testing. Android places restrictions on background apps and distinguishes asynchronous foreground work from scheduled work; ordinary asynchronous work is not guaranteed to finish after the app leaves a valid lifecycle stage ([Android background-task overview](https://developer.android.com/develop/background-work/background-tasks)). Therefore, "run when connection returns" is not a guarantee.

Before L3 can be approved, produce a separate ADR and tests for:

- a durable outbox schema and ordering rules;
- per-operation conflict resolution;
- token refresh and logged-out behavior;
- exponential backoff with jitter and a retry ceiling;
- process death/reboot recovery;
- battery/network constraints;
- user controls and observability;
- duplicate and poison-message handling.

Until then, retries occur while the app is foregrounded, on explicit user action, or on a clearly disclosed foreground refresh.

## Connectivity and error model

Connectivity indicators are hints, not proof. A device may report a network while DNS, captive portal, Supabase, storage, or the AI host is unreachable. Request outcomes and bounded timeouts are authoritative.

- Reads: retry transient failures with a small capped backoff; allow manual retry; keep stale data visible.
- Mutations: do not automatically retry unless idempotency is guaranteed.
- Authentication: restore the local session, then verify/refresh online; show cached private data only for the same local account and require re-authentication for sensitive mutation after expiry.
- Partial responses: validate every payload against the client schema; reject malformed/partial data and keep the last known valid view.
- AI: time out, label failure, preserve inputs, and return to manual editing. A template fallback must not be called AI.
- Notifications: treat them as hints; notification taps re-fetch authorized state. Delayed/missing delivery must not lose activity because the in-app activity table is canonical.

## Conflict rules

P0 favors server authority and explicit user decisions:

- New local draft versus no server entity: safe to submit once.
- Editing an existing entity: send the last known `updatedAt`/version; on conflict, show both versions and require review.
- Application already exists: server unique constraint returns the existing application.
- Gig already filled/closed: reject the pending application with a clear final reason.
- Assignment/state transition already performed: return the authoritative state; do not create another row.
- Submission revision conflict: preserve the local draft and require the user to rebase it on the current milestone state.

## Connectivity test matrix

Run this matrix on a physical Android device. Save screenshots/video plus logs that contain request IDs but no tokens or PII.

| Scenario | Operation | Expected result | Recovery evidence |
|---|---|---|---|
| Airplane mode before launch | Restore session and home | Cached same-user summary opens with offline/stale label; no false empty state | Reconnect refreshes and clears banner |
| Network drops during list fetch | Browse gigs | Last valid cache remains; bounded error and retry appear | Retry returns one validated page without duplicates |
| Slow network/high latency | Search/filter | Loading remains cancellable; stale list is usable | Latest request wins; old response cannot overwrite it |
| Timeout after application tap | Create application | State is `unknown/pending`, not success | Lookup by idempotency key confirms existing row or permits safe retry |
| Double tap/repeated retry | Any mutation | One server-side effect | Same canonical result/ID is returned |
| Backend 401/expired token | Protected read/mutation | One bounded refresh attempt; no retry loop | Re-authentication preserves compatible local draft |
| Backend 429/5xx | Read and mutation | Respect retry guidance; cap attempts | Manual retry succeeds or final error remains actionable |
| Image upload interrupted | Submit evidence | Draft and local image remain; no broken submission | Resume/restart upload, verify object, then commit once |
| App killed during upload | Submit evidence | On restart state is reconciled, not assumed complete | Orphan/success is detected and user can continue |
| AI host unavailable | Build job brief | Inputs persist; timeout; manual editor opens | No paid provider or misleading generated content |
| Notification delayed/missing | Activity update | In-app activity still appears after refresh | Notification is treated only as a hint |
| Malformed/partial response | Any API read | Schema validation rejects it; prior valid UI remains | Error includes request ID; retry can recover |
| Supabase paused/unavailable | Demo journey | Cached read and prepared demo explanation work; writes fail honestly | Follow recovery in `FREE_TIER_AND_COST_POLICY.md` |

## Acceptance criteria

P0 resilience is accepted only when:

- no tested interruption silently loses a saved draft;
- no tested repeated request creates a duplicate domain record;
- offline, stale, pending, failed, and confirmed states are visibly different;
- critical state-changing actions require a server-confirmed result;
- cached private data is cleared on logout/account switch;
- local and server schemas reject malformed data;
- the complete matrix passes on the named competition device, with failures linked to issues;
- documentation never labels L1/L2 behavior as background synchronization.
