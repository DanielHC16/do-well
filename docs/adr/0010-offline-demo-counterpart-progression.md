# ADR 0010: Offline counterpart progression and product presentation

- **Status:** Accepted by project-owner request, 3 November 2026
- **Supersedes:** ADR 0006's manual two-person presentation and mandatory on-screen demo disclosures only

## Context

The installed offline APK leaves a worker at Applied unless the presenter operates the employer account. Its accepted-application screen also hides the assignment link once the gig becomes assigned. The owner requested completing either role's cycle independently, moving account switching into Settings, and ordinary product copy without repeated demo disclaimers.

## Decision

Keep the separate compile-time offline runtime and its versioned, validated local repository. Compose the present account's action with deterministic responses from the other account in one persisted transaction. Employers retain selection and approval; workers retain application and work submission. Recover pending counterpart turns on load and account switching, preserving progress and preventing duplicate events. Settings owns account switching and confirmed local reset.

Use ordinary marketplace labels on product screens. The distributed filename, repository README, presentation guide and PR explicitly identify the offline APK as simulated local data. No authentication, real employer acceptance, payment, hosted authorization, photo upload or remote synchronization is established by these local responses. Documentation must retain those boundaries even though they are no longer repeated in the app UI.

## Consequences

Either role can complete a reliable single-device demonstration. Switching accounts remains available for inspection without being required to unstick the cycle. State repair must persist before displaying success and remain retryable if storage fails. Live runtime, credentials, RLS and hosted operations remain unchanged; external service cost stays PHP 0 / USD 0.

## Verification

Regression tests must cover both cycles, saved pending progress, idempotent reconciliation, failed saves, duplicate transitions, assignment navigation and Settings. Rehearse both roles, restart persistence and reset in the actual rebuilt standalone APK before recording acceptance.
