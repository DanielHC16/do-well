# Architecture Decision Records

ADRs capture significant decisions whose reasoning must survive team and session changes.

## Statuses

- `Proposed`: recommendation awaiting approval.
- `Accepted`: approved for implementation.
- `Superseded`: replaced by a later ADR that links back to it.
- `Rejected`: evaluated and deliberately not selected.

## Process

1. Copy the next number using `NNNN-short-title.md`.
2. Record context, decision, alternatives, consequences, cost and security effects, and validation gates.
3. Open or update the milestone pull request.
4. Change `Proposed` to `Accepted` only after explicit approval.
5. Never rewrite accepted history to hide a changed decision; supersede it with a new ADR.

## Index

| ADR | Status | Decision |
|---|---|---|
| [0001](0001-expo-supabase-modular-architecture.md) | Accepted | Expo modular monolith with Supabase backend |
| [0002](0002-browser-oauth-and-deep-linking.md) | Accepted | Browser OAuth with hosted callback and app deep link |
| [0003](0003-zero-cost-nearby-discovery.md) | Accepted | List-first Haversine discovery; map is optional |
| [0004](0004-zero-cost-ai-inference.md) | Accepted | Local/deterministic zero-cost AI Job Brief Builder |
| [0005](0005-offline-capability-boundaries.md) | Accepted | Cache and drafts first; background sync deferred |
| [0006](0006-explicit-local-demo-runtime.md) | Accepted | Explicit, isolated local runtime for the competition demo |
| [0007](0007-foreground-location-and-list-first-discovery.md) | Accepted | Foreground location and list-first nearby discovery |
| [0008](0008-identity-workspace-and-admin-capabilities.md) | Accepted | Separation of Identity, Workspace Preference, and Server-Owned Capabilities |
| [0009](0009-scoped-account-server-state.md) | Accepted requirement applied | Scoped account/admin TanStack Query lifecycle and moderation refetch |
