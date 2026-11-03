# 0009 — Scoped account server state

Status: Accepted requirement applied to the M17/M18 repair. This records implementation of the existing AGENTS.md TanStack Query/framework-loader requirement and approved server-state architecture, rather than approval of a new milestone.

Date: 2026-11-03 (Asia/Manila)

## Context

[PR #48](https://github.com/DanielHC16/do-well/pull/48), tracked by [#47](https://github.com/DanielHC16/do-well/issues/47), restores Settings/Admin integration. The initial capability loader used a manual request effect, contrary to the repository's mandatory server-state layer. Review also reproduced an admin queue bug: after resolving a bounded first page of20 reports, the UI could show no reports while later open reports remained.

## Decision

Pin the JavaScript-only `@tanstack/react-query` package at `5.105.2`, compatible with the installed React19 peer range. Use a fresh QueryClient inside a user-keyed account boundary, no persistent capability/admin cache, no automatic request retries, and immediate unused-query garbage collection. The capability query gates protected content and validates the active account against the server response. Account changes remount the boundary and do not share authority or admin results.

Use query/mutation lifecycle for admin overview and the bounded open-report page. Await invalidation/refetch after a successful moderation decision so the first page is replenished and totals refresh. A failed refresh must show retry/error state rather than a false empty queue or permission to blindly resubmit an already-completed decision. Startup server workspace preference reads use the same query layer; local fallback remains a user-scoped navigation preference and never grants authority.

The backend contract, RPC authorization, RLS, schema, active-workspace semantics and non-admin denial remain unchanged. Older marketplace gateway/effect/cache implementations are not silently claimed migrated by this repair.

## Alternatives and consequences

Continuing ad-hoc request effects violates the existing standard. No verified native Expo route-loader integration exists in this codebase, so inventing one is inappropriate. A global persistent query cache would require broader authentication lifecycle integration and is unnecessary for this repair.

The scoped client costs one pinned open-source dependency and a small provider boundary. It adds no service, native module, billing, card or automatic overage. Existing native output can be reused, but final APK JavaScript must be rebundled after the dependency/source change.

## Verification

Retain capability denial/retry, malformed payload, server denial, account-switch isolation, server-default and local-activation tests. Add the reproduced20-to21 report replenishment regression and distinguish moderation success from refresh failure. Run formatting, lint, TypeScript, full Jest, Expo Doctor/export and remote CI; record actual APK signature/privacy/install/launch checks in the demo guide before delivery.
