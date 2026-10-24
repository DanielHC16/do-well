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
| [0001](0001-expo-supabase-modular-architecture.md) | Proposed | Expo modular monolith with Supabase backend |
| [0002](0002-browser-oauth-and-deep-linking.md) | Proposed | Browser OAuth with hosted callback and app deep link |
| [0003](0003-zero-cost-nearby-discovery.md) | Proposed | List-first Haversine discovery; map is optional |
| [0004](0004-zero-cost-ai-inference.md) | Proposed | Local Ollama experiment through an authenticated LAN gateway |
| [0005](0005-offline-capability-boundaries.md) | Proposed | Cache and drafts first; background sync deferred |
| [0006](0006-explicit-local-demo-runtime.md) | Accepted | Explicit, isolated local runtime for the competition demo |
