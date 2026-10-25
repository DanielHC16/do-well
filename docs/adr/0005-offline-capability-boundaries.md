# ADR 0005: Offline capability boundaries

- Status: Accepted
- Date: 2026-10-21

## Context

The product is geographically local-first, not fully offline-first, but must behave predictably on weak and intermittent mobile data. “Offline” can mean cached reads, drafting, or reliable queued synchronization; these are separate capabilities with different correctness risks.

## Decision

P0 provides explicit connectivity state, timeouts, retry controls, cached read-only gig lists/details with freshness metadata, persisted form drafts, idempotency keys for critical mutations, and recoverable upload/submission states. TanStack Query owns in-memory/server cache. Durable drafts and a small metadata cache use the selected Expo-supported local store after an M01/M13 compatibility check; authentication tokens use the Supabase-supported secure persistence adapter and are not mixed with ordinary drafts.

Do not silently replay arbitrary writes. P0 pending operations are narrowly scoped, visible to the user, and require an idempotent server contract. Image uploads are resumable only if the verified Storage API supports the chosen strategy; otherwise keep the local source, show failed/pending state, and require explicit retry. A submission is “submitted” only after the authoritative server acknowledges it.

Reliable background synchronization is deferred until M13 and may remain out of scope if Android scheduling, auth refresh, conflict resolution, or battery behavior cannot be proven. Cached data never implies that authorization is current. Destructive or state-transition operations revalidate server-side after reconnect.

## Alternatives considered

- Full offline-first replicated database: rejected as disproportionate for the competition MVP.
- Cache-only behavior marketed as offline support: rejected because it obscures lost-write risk.
- Automatic replay of every failed mutation: rejected because duplicates and stale transitions can corrupt marketplace state.

## Consequences

- Users can read recent data and preserve work during outages, while authoritative transitions remain understandable.
- Every asynchronous screen must show loading, empty, offline-stale, error, pending, and recovered states where applicable.
- Mutating APIs need client-generated idempotency keys, server-side uniqueness, and deterministic conflict responses.
- Connectivity tests are required on physical devices using throttling, airplane mode, process termination, and reconnect scenarios.

## Validation gates

- Drafts survive process death and device restart without containing session secrets.
- Duplicate retries create one server-side effect.
- Interrupted upload/submission never reports false completion.
- Cache freshness and offline state are visible; reconnect refreshes safely.
- Background sync is described as implemented only after physical-device proof.
