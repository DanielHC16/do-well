# DO-WELL engineering documentation

This directory is the durable source of engineering context. Chat history is not a project record.

## Start or resume work

1. Read the repository `AGENTS.md`.
2. Read `SESSION_HANDOFF.md` for verified current state.
3. Read `IMPLEMENTATION_ROADMAP.md` and select only the next approved milestone.
4. Inspect `git status --short --branch`, `git log -5 --oneline`, and the open GitHub issue and pull request.
5. Read the architecture documents relevant to that milestone.
6. Work test-first, verify the result, scan the staged diff for secrets, and update the handoff before stopping.

## Document map

| Document | Purpose |
|---|---|
| `PRODUCT_REQUIREMENTS.md` | Approved scope, users, flows, exclusions, and acceptance boundaries |
| `ARCHITECTURE.md` | App structure, runtime boundaries, contracts, state, and error handling |
| `DATABASE_SCHEMA.md` | PostgreSQL entities, constraints, indexes, relationships, and transitions |
| `SECURITY_AND_RLS.md` | Threat model, authorization, RLS, Storage, abuse controls, and verification |
| `AUTHENTICATION.md` | Email/password and Google browser OAuth flows, deep links, sessions, onboarding |
| `AI_STRATEGY.md` | Real-inference options, selected experiment, safeguards, fallback, and evaluation |
| `ANDROID_INTEGRATIONS.md` | Android permissions, location, maps, media, notifications, builds, and devices |
| `OFFLINE_STRATEGY.md` | Weak-connectivity behavior, cache, drafts, pending writes, retries, and tests |
| `FREE_TIER_AND_COST_POLICY.md` | Zero-cost guardrails, current quotas, monitoring, and recovery |
| `IMPLEMENTATION_ROADMAP.md` | Sequential M00-M14 delivery plan and current completion state |
| `DEVELOPMENT_WORKFLOW.md` | Branch, commit, review, CI, issue, and pull-request workflow |
| `SETUP_GUIDE.md` | Local toolchain corrections and future project setup commands |
| `DECISIONS.md` | Confirmed, proposed, deferred, and blocked decisions |
| `SESSION_HANDOFF.md` | Current branch, issue/PR, verification, blockers, and exact next task |
| `adr/` | Immutable records for significant architecture choices |
| `plans/` | Engineer-ready implementation plans for approved milestones |

## Decision language

- **Confirmed**: explicitly approved or already verified in the repository.
- **Proposed**: recommended and awaiting project-owner approval.
- **Experiment required**: cannot be selected honestly without a benchmark or proof.
- **Blocked**: requires missing rules, credentials, hardware, or a material owner decision.
- **Deferred**: intentionally outside the MVP or current milestone.

When documents conflict, the approved product specification governs product behavior, ADRs govern accepted technical decisions, and the latest verified `SESSION_HANDOFF.md` governs operational state. Raise material conflicts; do not silently choose.
